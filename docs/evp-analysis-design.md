# EVP分析機能 設計書

## 1. 概要

### 1.1 目的
プロジェクトの予算と実績時間を基にEVP（Earned Value Performance）分析を行い、プロジェクトの進捗状況やコストパフォーマンスを可視化する機能を実装する。

### 1.2 EVP分析とは
EVP分析は、プロジェクトマネジメントにおいて、以下の指標を用いてプロジェクトの進捗とコストを管理する手法：

- **PV (Planned Value)**: 計画価値 - 現時点で完了すべき作業の予算
- **EV (Earned Value)**: 出来高価値 - 実際に完了した作業の予算価値
- **AC (Actual Cost)**: 実コスト - 実際に発生したコスト
- **SV (Schedule Variance)**: スケジュール差異 = EV - PV
- **CV (Cost Variance)**: コスト差異 = EV - AC
- **SPI (Schedule Performance Index)**: スケジュール効率指数 = EV / PV
- **CPI (Cost Performance Index)**: コスト効率指数 = EV / AC
- **ETC (Estimate To Complete)**: 完成時予測コスト
- **EAC (Estimate At Completion)**: 完成時総コスト予測

## 2. データベース設計

### 2.1 Projectテーブルの拡張

現在のProjectモデルに以下のフィールドを追加：

```prisma
model Project {
  // 既存のフィールド
  id               String    @id @default(uuid())
  projectNumber    String    @unique
  projectName      String
  description      String?
  status           String    @default("planning")
  plannedStartDate DateTime?
  plannedEndDate   DateTime?
  actualStartDate  DateTime?
  actualEndDate    DateTime?
  createdAt        DateTime  @default(now())
  updatedAt        DateTime  @updatedAt

  // 新規追加フィールド
  budget           Decimal?  @db.Decimal(15, 2)  // 予算（円）
  hourlyRate       Decimal?  @db.Decimal(10, 2)  // 時間単価（円/時間）

  // Relations
  schedulePlans    SchedulePlan[]
  scheduleActuals  ScheduleActual[]
  issues           Issue[]

  @@map("projects")
}
```

## 3. 機能設計

### 3.1 メニュー構成

サイドバーメニューに「EVP分析」を追加：
- 位置：「ガントチャート」の下
- アイコン：TrendingUp（lucide-react）
- パス：`/evp-analysis`

### 3.2 画面構成

#### 3.2.1 EVP分析画面（/evp-analysis）

**主要コンポーネント：**
1. **プロジェクト選択部**
   - プロジェクト選択ドロップダウン
   - 選択したプロジェクトの基本情報表示
     - プロジェクト名
     - 予算
     - 期間（開始日〜終了日）
     - ステータス

2. **分析指標表示部**
   - カード形式で主要指標を表示
     - PV（計画価値）
     - EV（出来高価値）
     - AC（実コスト）
     - SV（スケジュール差異）
     - CV（コスト差異）
     - SPI（スケジュール効率指数）
     - CPI（コスト効率指数）

3. **グラフ表示部**
   - 時系列EVPチャート（PV、EV、AC の推移）
   - バーンダウンチャート

4. **詳細テーブル**
   - 月別/週別の詳細データ表示

### 3.3 案件管理機能の拡張

#### 3.3.1 案件編集フォームの拡張
- 予算入力フィールドの追加
- 時間単価入力フィールドの追加（オプション）

#### 3.3.2 案件詳細ページの拡張
- 予算情報の表示
- EVP分析へのリンクボタン追加

## 4. API設計

### 4.1 既存APIの拡張

#### PUT /api/projects/[id]
予算フィールドの更新に対応

### 4.2 新規API

#### GET /api/evp-analysis/[projectId]
EVP分析データを取得

**レスポンス：**
```typescript
interface EVPAnalysisData {
  project: {
    id: string
    projectName: string
    budget: number
    plannedStartDate: string
    plannedEndDate: string
    actualStartDate?: string
    actualEndDate?: string
  }
  metrics: {
    pv: number  // 計画価値
    ev: number  // 出来高価値
    ac: number  // 実コスト
    sv: number  // スケジュール差異
    cv: number  // コスト差異
    spi: number // スケジュール効率指数
    cpi: number // コスト効率指数
    etc: number // 残作業予測コスト
    eac: number // 完成時総コスト予測
  }
  timeSeries: Array<{
    date: string
    pv: number
    ev: number
    ac: number
  }>
  actualHours: Array<{
    userId: string
    userName: string
    totalHours: number
    cost: number
  }>
}
```

## 5. 技術スタック

- **フロントエンド**
  - Next.js 14（App Router）
  - React Hook Form（フォーム管理）
  - shadcn/ui（UIコンポーネント）
  - Recharts（グラフ描画）
  - date-fns（日付処理）

- **バックエンド**
  - Next.js API Routes
  - Prisma（ORM）
  - PostgreSQL

## 6. 実装順序

1. **Phase 1: データベース拡張**
   - Prismaスキーマの更新
   - マイグレーション実行

2. **Phase 2: 案件管理機能の拡張**
   - 案件編集フォームに予算フィールド追加
   - 案件詳細ページに予算情報表示

3. **Phase 3: EVP分析画面の実装**
   - メニューへの追加
   - プロジェクト選択機能
   - 分析指標の計算と表示
   - グラフ表示

## 7. EVP計算ロジック

### 7.1 基本計算式

```typescript
// 計画時間の計算
// プロジェクト期間の営業日数 × 8時間（1日の標準作業時間）
const calculatePlannedHours = (plannedStartDate: Date, plannedEndDate: Date) => {
  const businessDays = getBusinessDaysCount(plannedStartDate, plannedEndDate)
  return businessDays * 8 // 1日8時間として計算
}

// PV（計画価値）の計算
// プロジェクト期間における現時点での計画進捗率 × 総予算
const calculatePV = (budget: number, plannedStartDate: Date, plannedEndDate: Date, currentDate: Date) => {
  const totalDays = differenceInDays(plannedEndDate, plannedStartDate)
  const elapsedDays = differenceInDays(currentDate, plannedStartDate)
  const plannedProgress = Math.min(elapsedDays / totalDays, 1)
  return budget * plannedProgress
}

// AC（実コスト）の計算
// 実績時間 × 時間単価
const calculateAC = (actualHours: number, hourlyRate: number) => {
  return actualHours * hourlyRate
}

// EV（出来高価値）の計算
// 実績時間 / 計画時間 × 総予算
const calculateEV = (actualHours: number, plannedHours: number, budget: number) => {
  const progress = Math.min(actualHours / plannedHours, 1)
  return budget * progress
}

// 各種指標の計算
const calculateMetrics = (pv: number, ev: number, ac: number, budget: number) => {
  return {
    sv: ev - pv,           // スケジュール差異
    cv: ev - ac,           // コスト差異
    spi: pv > 0 ? ev / pv : 0,  // スケジュール効率指数
    cpi: ac > 0 ? ev / ac : 0,  // コスト効率指数
    etc: (budget - ev) / (ac > 0 ? ev / ac : 1),  // 残作業予測コスト
    eac: ac + etc          // 完成時総コスト予測
  }
}
```

## 8. 仕様確定事項

### 8.1 時間単価の扱い
- **決定**: プロジェクトごとに時間単価を設定
- **実装**: ProjectテーブルのhourlyRateフィールドで管理

### 8.2 進捗率の算出方法
- **決定**: 実績時間 / 計画時間で算出
- **計算式**: `進捗率 = 実績時間合計 / 計画時間`

### 8.3 予定時間の管理
- **決定**: プロジェクトの開始予定日と終了予定日から自動算出
- **計算方法**:
  - プロジェクト期間の営業日数を算出
  - 営業日数 × 8時間（1日の標準作業時間）で計画時間を計算

### 8.4 権限管理
- **決定**: 全ユーザーが閲覧可能
- **実装**: 認証済みユーザーであれば誰でもアクセス可能

### 8.5 データ更新頻度
- **決定**: 画面アクセス時に都度計算
- **実装方法**:
  - キャッシュは使用せず、常に最新データから計算
  - APIアクセス時にリアルタイムで集計処理を実行