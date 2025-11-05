# 実績台帳機能 設計書

## 1. 概要

実績台帳は、案件と発注情報を統合して、プロジェクトの収益性を管理・分析するための機能です。
発注金額、外注費、サーバー費用、投下工数から粗利と粗利率を算出し、案件ごとの収益性を一覧表示します。

### 1.1 主要な設計決定事項

| 項目 | 決定内容 |
|------|---------|
| 発注書なしの案件 | 表示する。発注金額は発注書金額→案件予算→0円の順 |
| 時間単価がNULLの場合 | デフォルト値 5,000円/時間を使用 |
| 種別のデフォルト | 「開発」（既存データもすべて開発に設定） |
| 投下工数の計算 | 事前計算方式（Projectテーブルに保存） |
| projectId変更時 | 変更前と変更後の両案件の集計値を再計算 |
| トランザクション処理 | 実績更新失敗時は集計値更新もロールバック |
| 案件削除の制約 | 実績データがある案件は削除不可 |
| アクセス権限 | 実績台帳は全ユーザー閲覧可、新規フィールドは全員閲覧可 |
| 初期表示 | 完了案件を除外、発行日降順（なければ登録日降順） |
| 粗利率表示 | マイナスは濃い赤色で-15.5%のように表示 |

## 2. 表示項目

実績台帳には以下の項目を表示します：

| 項目名 | データソース | 備考 |
|--------|-------------|------|
| 案件番号 | Project.projectNumber | 案件番号 |
| 案件名 | Project.projectName | 案件名 |
| 発行日 | PurchaseOrder.issueDate | 発注書の発行日（なければ案件登録日） |
| 発注先 | PurchaseOrder.supplier.name | 顧客名（なければ空欄） |
| 種別 | Project.projectType | 新規フィールド（開発/SES/保守/その他、デフォルト：開発） |
| 記入者 | PurchaseOrder.user | 発注書作成者（なければ空欄） |
| チーム | Project.department.name | 担当部署・チーム名 |
| ステータス | Project.status | 案件のステータス（完了は初期表示で除外） |
| メモ | Project.memo | 新規フィールド |
| 発注金額 | PurchaseOrder.totalAmount または Project.budget | 発注書金額、なければ案件予算（なければ0円） |
| 納期 | PurchaseOrder.deliveryDate | 発注書の納期 |
| 納品日 | Project.deliveryDate | 新規フィールド |
| 請求可能日 | Project.invoiceableDate | 新規フィールド |
| 外注費 | Project.outsourcingCost | 新規フィールド |
| サーバー・ドメイン代 | Project.serverDomainCost | 新規フィールド |
| 投下工数 | Project.totalLaborCost | 事前計算済みの値（実績更新時に自動計算） |
| 粗利 | 計算値 | 発注金額 - 外注費 - サーバー・ドメイン代 - 投下工数 |
| 粗利率 | 計算値 | (粗利 ÷ 発注金額) × 100 (%)、赤字は濃い赤色で-15.5%のように表示 |

## 3. データベース設計

### 3.1 Projectテーブルへの追加フィールド

```prisma
model Project {
  // ... 既存フィールド

  // 実績台帳用の新規フィールド
  projectType       String?   @default("development") // 種別: development(開発), ses(SES), maintenance(保守), other(その他)
  deliveryDate      DateTime? @db.Date // 納品日
  invoiceableDate   DateTime? @db.Date // 請求可能日
  memo              String?   @db.Text // メモ
  outsourcingCost   Decimal?  @default(0) @db.Decimal(15, 2) // 外注費（円）
  serverDomainCost  Decimal?  @default(0) @db.Decimal(15, 2) // サーバー・ドメイン代（円）

  // パフォーマンス最適化：集計値の事前計算
  totalLaborHours   Decimal?  @default(0) @db.Decimal(10, 2) // 総作業時間（実績の合計）
  totalLaborCost    Decimal?  @default(0) @db.Decimal(15, 2) // 総投下工数（円）= totalLaborHours × hourlyRate
  lastCalculatedAt  DateTime? // 最終集計日時

  // ... Relations
}
```

### 3.2 種別の選択肢

- `development`: 開発
- `ses`: SES
- `maintenance`: 保守
- `other`: その他

## 4. 計算ロジック

### 4.1 投下工数の計算（事前計算方式）

投下工数は毎回計算するのではなく、Projectテーブルの`totalLaborHours`と`totalLaborCost`に事前計算して保存します。

**実績台帳表示時**:
```typescript
// 事前計算された値を使用（計算コストほぼゼロ）
const laborCost = project.totalLaborCost || 0
```

**実績更新時の再計算ロジック**:
```typescript
// ScheduleActualの作成・更新・削除時に自動実行
async function recalculateProjectLaborCost(projectId: string) {
  // 案件に紐づく全実績時間の合計を取得
  const totalHours = await prisma.scheduleActual.aggregate({
    where: { projectId },
    _sum: { hours: true }
  })

  // 案件情報を取得
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { hourlyRate: true }
  })

  // 投下工数を計算
  // 時間単価がNULLの場合は5,000円/時間をデフォルト値として使用
  const hours = totalHours._sum.hours || 0
  const hourlyRate = project?.hourlyRate || 5000
  const laborCost = hours * hourlyRate

  // Projectテーブルを更新
  await prisma.project.update({
    where: { id: projectId },
    data: {
      totalLaborHours: hours,
      totalLaborCost: laborCost,
      lastCalculatedAt: new Date()
    }
  })
}
```

### 4.2 粗利の計算

```typescript
// 粗利 = 発注金額 - 外注費 - サーバー・ドメイン代 - 投下工数
const grossProfit =
  purchaseOrder.totalAmount -
  (project.outsourcingCost || 0) -
  (project.serverDomainCost || 0) -
  (project.totalLaborCost || 0) // 事前計算された値を使用
```

### 4.3 粗利率の計算

```typescript
// 粗利率 = (粗利 ÷ 発注金額) × 100
const grossProfitRate =
  purchaseOrder.totalAmount > 0
    ? (grossProfit / purchaseOrder.totalAmount) * 100
    : 0
```

### 4.4 集計値の更新タイミング

以下のタイミングで`recalculateProjectLaborCost()`を実行します：

1. **実績（ScheduleActual）の作成時**
   - `POST /api/schedules/[scheduleId]/actuals`
   - 該当案件の集計値を再計算

2. **実績（ScheduleActual）の更新時**
   - `PUT /api/schedules/[scheduleId]/actuals/[actualId]`
   - `hours`が変更された場合：該当案件の集計値を再計算
   - `projectId`が変更された場合：**変更前と変更後の両方の案件**の集計値を再計算

3. **実績（ScheduleActual）の削除時**
   - `DELETE /api/schedules/[scheduleId]/actuals/[actualId]`
   - 該当案件の集計値を再計算

4. **案件の時間単価変更時**
   - `PUT /api/projects/[id]`
   - `hourlyRate`が変更された場合：該当案件の集計値を再計算

### 4.5 トランザクション処理

実績の更新と集計値の再計算は**トランザクション内で実行**します：

```typescript
// 実績更新時のトランザクション処理例
await prisma.$transaction(async (tx) => {
  // 実績の更新
  await tx.scheduleActual.update({
    where: { id: actualId },
    data: updateData
  })

  // projectIdが変更された場合、両方の案件を再計算
  if (oldProjectId && newProjectId && oldProjectId !== newProjectId) {
    await recalculateProjectLaborCost(oldProjectId, tx)
    await recalculateProjectLaborCost(newProjectId, tx)
  } else if (newProjectId) {
    await recalculateProjectLaborCost(newProjectId, tx)
  }
})
```

**失敗時の処理**：
- 集計値の再計算が失敗した場合、実績の更新自体をロールバック
- エラーメッセージをユーザーに通知
- ログに詳細を記録

## 5. API設計

### 5.1 実績台帳データ取得API

**エンドポイント**: `GET /api/performance-ledger`

**クエリパラメータ**:
- `page`: ページ番号（デフォルト: 1）
- `limit`: 1ページあたりの件数（デフォルト: 50）
- `projectType`: 種別でフィルター（オプション）
- `status`: ステータスでフィルター（オプション、デフォルト: completedを除外）
- `departmentId`: チームでフィルター（オプション）
- `startDate`: 発行日の開始日でフィルター（オプション）
- `endDate`: 発行日の終了日でフィルター（オプション）
- `sortBy`: ソート項目（デフォルト: issueDate）
- `sortOrder`: ソート順（desc/asc、デフォルト: desc）

**初期表示の挙動**:
- ステータスが「完了」の案件は除外
- 発行日の降順でソート（発行日がない場合は案件登録日の降順）

**レスポンス**:
```typescript
{
  data: [
    {
      projectId: string // 案件ID
      projectNumber: string // 案件番号
      projectName: string // 案件名
      issueDate: string | null // 発行日（発注書の発行日、なければ案件登録日）
      supplierName: string | null // 発注先（なければnull）
      projectType: string // 種別（development/ses/maintenance/other）
      editorName: string | null // 記入者（発注書作成者、なければnull）
      teamName: string | null // チーム
      status: string // ステータス
      memo: string | null // メモ
      orderAmount: number // 発注金額（発注書金額→案件予算→0円の優先順）
      deliveryDeadline: string | null // 納期
      deliveryDate: string | null // 納品日
      invoiceableDate: string | null // 請求可能日
      outsourcingCost: number // 外注費
      serverDomainCost: number // サーバー・ドメイン代
      laborCost: number // 投下工数（事前計算済み）
      grossProfit: number // 粗利
      grossProfitRate: number // 粗利率（%）
    }
  ],
  pagination: {
    currentPage: number
    totalPages: number
    totalCount: number
    limit: number
  }
}
```

### 5.2 実績台帳エクスポートAPI（将来的な拡張）

**エンドポイント**: `GET /api/performance-ledger/export`

Excel形式でエクスポート可能にする（Phase 2で実装）

## 6. UI設計

### 6.1 レイアウト

- サイドバーの「EVM分析」の下に「実績台帳」メニューを追加
- 表示項目が多いため、以下の工夫を実施：
  - 文字サイズを小さく（`text-xs`）
  - 横スクロール可能なテーブル（`overflow-x-auto`）
  - 固定列（案件番号、件名）でスクロール時も視認性を確保
  - レスポンシブ対応（モバイルではカード形式に切り替え）

### 6.2 フィルター機能

- 種別フィルター（開発/SES/保守/その他）
- ステータスフィルター（**初期値：完了以外を表示**）
- チームフィルター
- 発行日期間フィルター

### 6.3 ソート機能

- 各列でソート可能
- **初期表示：発行日の降順（発行日がない場合は案件登録日の降順）**
- 発行日、粗利、粗利率でのソートを優先的に実装

### 6.4 カラースキーマ

粗利率に応じた色分け：

| 粗利率 | 色 | 表示例 | 評価 |
|--------|-----|--------|------|
| 30%以上 | 緑色 | `35.2%` | 優良 |
| 10-30% | 黄色 | `18.5%` | 標準 |
| 0-10% | 赤色 | `5.3%` | 要改善 |
| マイナス | 濃い赤色 | `-15.5%` | 赤字 |

## 7. 案件管理画面の変更

### 7.1 新規作成画面（`/projects/new`）

以下のフィールドを追加：

1. **種別**（必須）
   - ラジオボタンまたはセレクトボックス
   - 選択肢: 開発、SES、保守、その他
   - デフォルト値: 開発

2. **納品日**（オプション）
   - 日付ピッカー

3. **請求可能日**（オプション）
   - 日付ピッカー

4. **メモ**（オプション）
   - テキストエリア

5. **外注費**（オプション）
   - 数値入力（円単位）
   - デフォルト: 0

6. **サーバー・ドメイン代**（オプション）
   - 数値入力（円単位）
   - デフォルト: 0

### 7.2 編集画面（`/projects/[id]/edit`）

新規作成画面と同じフィールドを表示・編集可能にする

### 7.3 詳細画面（将来的に実装する場合）

新規フィールドを含む全情報を表示

## 8. 実装計画

### Phase 1: データベース・バックエンド

1. **Prismaスキーマの更新**
   - Projectテーブルに新規フィールドを追加（9フィールド）
     - 実績台帳用：projectType, deliveryDate, invoiceableDate, memo, outsourcingCost, serverDomainCost
     - 集計値用：totalLaborHours, totalLaborCost, lastCalculatedAt
   - マイグレーションファイルの生成と実行

2. **集計値の更新ロジックの実装**
   - `recalculateProjectLaborCost()` ユーティリティ関数の作成
   - 実績APIの更新：POST/PUT/DELETE時に集計値を自動更新
   - 案件APIの更新：hourlyRate変更時に集計値を再計算
   - データベースインデックスの追加（schedule_actuals.project_id）

3. **実績台帳APIの実装**
   - `/api/performance-ledger` エンドポイントの作成
   - データ取得ロジックの実装（事前計算された値を使用）
   - ページネーション対応

4. **案件管理APIの更新**
   - `/api/projects` の POST, PUT エンドポイントを新規フィールドに対応
   - `/api/projects/[id]` の DELETE エンドポイントに実績データチェックを追加

5. **既存データの移行スクリプト**
   - 既存案件の集計値を一括計算するスクリプト作成

### Phase 2: フロントエンド（案件管理画面）

1. **案件フォームコンポーネントの更新**
   - `project-form.tsx` に新規フィールドを追加
   - バリデーションロジックの追加

2. **案件一覧画面の更新**
   - 必要に応じて新規フィールドを表示

### Phase 3: フロントエンド（実績台帳画面）

1. **実績台帳ページの作成**
   - `/performance-ledger/page.tsx` の作成
   - テーブルコンポーネントの実装

2. **フィルター・ソート機能の実装**
   - フィルターコンポーネント
   - ソート機能

3. **SWRフックの作成**
   - `use-performance-ledger.ts` フックの実装

4. **サイドバーメニューの更新**
   - 「実績台帳」メニューの追加

### Phase 4: テスト・最適化

1. **E2Eテストの作成**
   - Cypress テストの実装

2. **パフォーマンス最適化**
   - データベースクエリの最適化
   - インデックスの追加

## 9. セキュリティとアクセス制御

### 9.1 実績台帳へのアクセス
- 実績台帳画面は**管理者のみ**アクセス可能
- 一般ユーザーはアクセス不可
- APIレベルでの権限チェック実装

### 9.2 案件管理画面の新規フィールド
- 案件の新規フィールド（種別、外注費、サーバー費用等）は**一般ユーザーも閲覧・編集可能**
- 既存の案件管理画面の権限設定に従う

## 10. 今後の拡張案

1. **エクスポート機能**
   - Excel形式でのエクスポート
   - PDF形式でのエクスポート

2. **グラフ表示**
   - 月別粗利推移グラフ
   - 種別別粗利グラフ
   - チーム別粗利グラフ

3. **予算実績比較**
   - 予算との差異分析
   - 進捗率と粗利率の相関分析

4. **アラート機能**
   - 粗利率が低い案件の警告
   - 納期遅延の警告

## 11. 実装上の注意事項

### 11.1 データ整合性

**発注書が紐づいていない案件の扱い**：
- 発注書が未設定（`purchaseOrderId` がnull）の案件も実績台帳に表示
- 発注金額は以下の優先順で取得：
  1. `PurchaseOrder.totalAmount`（発注書の金額）
  2. `Project.budget`（案件の予算）
  3. `0`（いずれもnullの場合）

**案件削除時の制約**：
- 関連する実績（ScheduleActual）が存在する場合、案件は削除不可
- エラーメッセージ：「この案件には実績データが存在するため削除できません」
- 削除前に実績の有無をチェック

**ユーザー削除/無効化時の表示**：
- 記入者（発注書作成者）のユーザーが削除または無効化された場合
- ユーザー情報が取得できれば氏名を表示、できなければ空欄
- 論理削除（status: inactive）を推奨

### 11.2 パフォーマンス最適化

**集計値の事前計算方式を採用**：
- 実績台帳表示時は事前計算された`totalLaborCost`を使用するため、ほぼ計算コストゼロ
- 実績登録時に若干のオーバーヘッド（1案件のみの集計なので影響は軽微）

**インデックスの追加**：
```sql
CREATE INDEX idx_schedule_actuals_project_id ON schedule_actuals(project_id);
CREATE INDEX idx_projects_purchase_order_id ON projects(purchase_order_id);
```

**データ整合性の担保**：
- `lastCalculatedAt`で最終更新日時を記録
- データ不整合が発生した場合は、管理画面から手動再計算を実行可能にする（将来的な拡張）

### 11.3 小数点処理

- 金額計算は `Decimal` 型を使用
- 表示時は小数点以下を適切に丸める（円単位）
- 粗利率は小数点1桁まで表示

## 12. マイグレーション戦略

### 12.1 既存データの扱い

**新規フィールドの初期値**：
- `projectType`: `"development"`（既存案件はすべて「開発」に設定）
- `deliveryDate`, `invoiceableDate`, `memo`: `NULL`
- `outsourcingCost`, `serverDomainCost`: `0`（デフォルト値）
- 集計値フィールド（`totalLaborHours`, `totalLaborCost`）：`0`（デフォルト値）

**マイグレーションの手順**：

1. **スキーマ変更の適用**：
```bash
npx prisma migrate dev --name add_performance_ledger_fields
```

2. **既存案件の集計値を一括計算**：
```typescript
// scripts/migrate-calculate-labor-costs.ts
async function migrateCalculateLaborCosts() {
  const projects = await prisma.project.findMany({
    select: { id: true }
  })

  console.log(`Processing ${projects.length} projects...`)

  for (const project of projects) {
    await recalculateProjectLaborCost(project.id)
    console.log(`Calculated: ${project.id}`)
  }

  console.log('Migration completed!')
}
```

実行コマンド：
```bash
npx ts-node scripts/migrate-calculate-labor-costs.ts
```

**注意事項**：
- 既存案件の種別はすべて「開発」に設定されるため、必要に応じて後から手動で修正
- 集計値は自動計算されるため、手動での入力は不要

### 12.2 ロールバック計画

- マイグレーションのロールバックスクリプトを用意
- テスト環境で十分に検証してから本番適用
- 集計値フィールドは削除可能（データロスなし）

## 13. 実装の優先順位

### 高優先度（Phase 1-2）
1. Prismaスキーマの更新とマイグレーション
2. 集計値更新ロジック（recalculateProjectLaborCost）の実装
3. 実績・案件APIへの集計トリガー組み込み
4. 既存データ移行スクリプトの実行
5. 案件管理画面への新規フィールド追加
6. 実績台帳APIの実装

### 中優先度（Phase 3）
4. 実績台帳画面の実装
5. フィルター・ソート機能
6. サイドバーメニューの更新

### 低優先度（Phase 4以降）
7. エクスポート機能
8. グラフ表示
9. E2Eテスト

## 14. 開発スケジュール見積もり

| フェーズ | 作業内容 | 見積時間 |
|---------|---------|---------|
| Phase 1 | DBスキーマ更新・マイグレーション | 2時間 |
| Phase 1 | 集計値更新ロジックの実装 | 3時間 |
| Phase 1 | 実績・案件API更新（集計トリガー組み込み） | 2時間 |
| Phase 1 | 既存データ移行スクリプト | 1時間 |
| Phase 1 | 実績台帳API実装 | 3時間 |
| Phase 2 | 案件フォーム更新 | 3時間 |
| Phase 3 | 実績台帳画面実装 | 6時間 |
| Phase 3 | フィルター・ソート実装 | 3時間 |
| Phase 4 | テスト・最適化 | 4時間 |
| **合計** | | **27時間** |

**主な追加工数**：
- 集計値更新ロジック（recalculateProjectLaborCost）の実装：3時間
- 既存APIへの集計トリガー組み込み：2時間
- 既存データの移行スクリプト：1時間
