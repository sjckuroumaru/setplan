# SWR移行計画書

## 目次
1. [概要](#概要)
2. [現状分析](#現状分析)
3. [移行の目的とメリット](#移行の目的とメリット)
4. [技術仕様](#技術仕様)
5. [段階的移行計画](#段階的移行計画)
6. [実装ガイドライン](#実装ガイドライン)
7. [テスト計画](#テスト計画)
8. [リスクと対策](#リスクと対策)
9. [スケジュール](#スケジュール)

---

## 概要

本ドキュメントは、プロジェクト全体にSWR（stale-while-revalidate）を導入するための移行計画を定義します。

**作成日**: 2025-10-08
**対象**: setplanプロジェクト全体
**技術スタック**: Next.js 15, React, TypeScript, SWR

---

## 現状分析

### 現在のデータフェッチ方法

現在、プロジェクト全体で以下のパターンでデータフェッチを実装しています：

```typescript
// 現在の実装パターン
const [data, setData] = useState([])
const [loading, setLoading] = useState(true)

useEffect(() => {
  const fetchData = async () => {
    const response = await fetch('/api/endpoint')
    const data = await response.json()
    setData(data)
    setLoading(false)
  }
  fetchData()
}, [dependencies])
```

### 問題点

1. **タブ切り替え時の不要な再取得**: ブラウザタブを切り替えるたびにデータが再取得される
2. **キャッシュ管理の欠如**: 同じデータを複数回取得
3. **重複リクエストの発生**: 複数コンポーネントが同時に同じAPIを呼び出す
4. **手動でのローディング・エラー管理**: 各ページで個別に実装
5. **コードの重複**: 各ページで似たようなフェッチロジックを実装

### 対象ページ一覧

| カテゴリ | ページ | 優先度 | データフェッチ頻度 |
|---------|--------|--------|------------------|
| **コア機能** |
| 予定実績管理 | `/schedules` | **高** | 高 |
| 課題管理 | `/issues` | **高** | 高 |
| ガントチャート | `/gantt` | **高** | 中 |
| 案件管理 | `/projects` | **高** | 中 |
| ダッシュボード | `/dashboard` | **高** | 高 |
| **マスタ管理** |
| 顧客管理 | `/customers` | 中 | 中 |
| ユーザー管理 | `/users` | 中 | 低 |
| 部署管理 | `/settings/departments` | 中 | 低 |
| 会社設定 | `/settings/company` | 中 | 低 |
| **分析・レポート** |
| 予定実績グラフ | `/schedules/chart` | 中 | 中 |
| EVM分析 | `/evm-analysis` | 中 | 低 |
| **取引管理** |
| 見積管理 | `/estimates` | 低 | 低 |
| 請求管理 | `/invoices` | 低 | 低 |
| 発注書管理 | `/purchase-orders` | 低 | 低 |

---

## 移行の目的とメリット

### 目的

1. タブ切り替え時の不要なデータ再取得を防止
2. キャッシュ管理の自動化と最適化
3. コードの一貫性と保守性の向上
4. ユーザー体験の改善（ローディング時間削減）

### 期待されるメリット

#### パフォーマンス改善
- 重複リクエストの削減（推定: 40-60%削減）
- 初回ロード後のページ遷移が高速化
- タブ切り替え時のちらつき解消

#### 開発効率向上
- ボイラープレートコードの削減
- 一貫したエラーハンドリング
- デバッグツールの活用

#### ユーザー体験向上
- スムーズな画面遷移
- オプティミスティックUI実装が容易
- オフライン対応の基盤

---

## 技術仕様

### SWR設定

#### グローバル設定

```typescript
// lib/swr-config.ts
import { SWRConfiguration } from 'swr'

export const swrConfig: SWRConfiguration = {
  // 再検証設定
  revalidateOnFocus: false,          // タブフォーカス時の再検証を無効
  revalidateOnReconnect: true,       // 再接続時は再検証
  revalidateIfStale: true,           // 古いデータの場合は再検証

  // キャッシュ設定
  dedupingInterval: 5000,            // 5秒以内の重複リクエストを防ぐ

  // エラーハンドリング
  shouldRetryOnError: true,
  errorRetryCount: 3,
  errorRetryInterval: 5000,

  // その他
  suspense: false,                   // Suspenseモードは使用しない
}
```

#### カスタムFetcher

```typescript
// lib/fetcher.ts
export async function fetcher<T>(url: string): Promise<T> {
  const response = await fetch(url)

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'API request failed')
  }

  return response.json()
}

// POST/PUT/DELETE用
export async function mutationFetcher<T>(
  url: string,
  { arg }: { arg: { method: string; body?: any } }
): Promise<T> {
  const response = await fetch(url, {
    method: arg.method,
    headers: {
      'Content-Type': 'application/json',
    },
    body: arg.body ? JSON.stringify(arg.body) : undefined,
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'API request failed')
  }

  return response.json()
}
```

#### カスタムフック例

```typescript
// hooks/use-schedules.ts
import useSWR from 'swr'
import { fetcher } from '@/lib/fetcher'

export function useSchedules(params: {
  page: number
  limit: number
  userId?: string
  departmentId?: string
  startDate?: string
  endDate?: string
}) {
  const queryParams = new URLSearchParams({
    page: params.page.toString(),
    limit: params.limit.toString(),
  })

  if (params.userId) queryParams.append('userId', params.userId)
  if (params.departmentId) queryParams.append('departmentId', params.departmentId)
  if (params.startDate) queryParams.append('startDate', params.startDate)
  if (params.endDate) queryParams.append('endDate', params.endDate)

  const { data, error, isLoading, mutate } = useSWR(
    `/api/schedules?${queryParams}`,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 5000,
    }
  )

  return {
    schedules: data?.schedules || [],
    pagination: data?.pagination,
    isLoading,
    isError: error,
    mutate, // 手動再検証用
  }
}
```

---

## 段階的移行計画

### フェーズ1: 基盤整備（Week 1）

**目標**: SWRの導入とカスタムフックの作成

#### タスク

1. **SWRインストールと設定**
   - [ ] `npm install swr` 実行
   - [ ] `lib/swr-config.ts` 作成
   - [ ] `lib/fetcher.ts` 作成
   - [ ] `app/layout.tsx` にSWRConfigプロバイダー追加

2. **共通カスタムフック作成**

   **基本フック（優先度：高）**:
   - [ ] `hooks/use-schedules.ts`
   - [ ] `hooks/use-issues.ts`
   - [ ] `hooks/use-projects.ts`
   - [ ] `hooks/use-users.ts`
   - [ ] `hooks/use-departments.ts`

   **追加フック（優先度：中）**:
   - [ ] `hooks/use-customers.ts`
   - [ ] `hooks/use-company.ts` - 会社情報取得用
   - [ ] `hooks/use-estimates.ts`
   - [ ] `hooks/use-invoices.ts`
   - [ ] `hooks/use-purchase-orders.ts`

3. **ドキュメント整備**
   - [ ] 実装ガイド作成
   - [ ] コード例の整備

**成果物**:
- SWR基盤コード
- カスタムフック（10種類）
- 実装ドキュメント

---

### フェーズ2: コア機能移行（Week 2-3）

**目標**: 最も使用頻度の高いページをSWRに移行

#### 優先度1: 予定実績管理（Week 2-前半）

**対象ページ**:
- `/schedules` - 一覧ページ
- `/schedules/new` - 新規作成（プロジェクト取得のみ）
- `/schedules/[id]/edit` - 編集（プロジェクト取得のみ）
- `/schedules/calendar` - カレンダー表示
- `/schedules/chart` - グラフ分析

**実装順序**:
1. `/schedules` 一覧ページ（最優先）
2. `/schedules/calendar`
3. `/schedules/chart`
4. フォーム系（new/edit）

**カスタムフック**:
```typescript
// hooks/use-schedules.ts - 既に作成
// hooks/use-schedules-analytics.ts - グラフ用
// hooks/use-schedule-by-date.ts - 日付別取得用
```

#### 優先度2: 課題管理（Week 2-後半）

**対象ページ**:
- `/issues` - 一覧ページ
- `/issues/[id]/page` - 詳細ページ
- `/issues/new` - 新規作成
- `/issues/[id]/edit` - 編集

**カスタムフック**:
```typescript
// hooks/use-issues.ts
// hooks/use-issue-detail.ts
// hooks/use-issue-comments.ts - コメント取得用
```

#### 優先度3: ガントチャート・案件管理（Week 3-前半）

**対象ページ**:
- `/gantt`
- `/projects`
- `/projects/new`
- `/projects/[id]/edit`

**カスタムフック**:
```typescript
// hooks/use-gantt-tasks.ts
// hooks/use-projects.ts (既に作成)
```

#### 優先度4: ダッシュボードとEVM分析（Week 3-後半）

**対象ページ**:
- `/dashboard`
- `/evm-analysis`

**カスタムフック**:
```typescript
// hooks/use-dashboard-stats.ts
// hooks/use-evm-analysis.ts - EVM分析データ取得用
```

**テスト計画**:
- 各ページの動作確認
- タブ切り替えテスト
- キャッシュ動作確認

---

### フェーズ3: マスタ管理移行（Week 4）

**目標**: マスタ系ページをSWRに移行

#### 対象ページ

1. **顧客管理**
   - `/customers`
   - `/customers/new`
   - `/customers/[id]/edit`

2. **ユーザー管理**
   - `/users`
   - `/users/new`
   - `/users/[id]/edit`

3. **部署管理**
   - `/settings/departments`
   - `/settings/departments/new`
   - `/settings/departments/[id]/edit`

4. **会社設定**
   - `/settings/company`

**カスタムフック**:
```typescript
// hooks/use-customers.ts
// hooks/use-departments.ts (既に作成)
// hooks/use-company.ts - 会社情報取得用
```

**特記事項**:
- マスタ系は更新頻度が低いため、キャッシュ時間を長めに設定
- 一覧ページと詳細ページでキャッシュを共有

---

### フェーズ4: 取引管理移行（Week 5）

**目標**: 取引系ページをSWRに移行

#### 対象ページ

1. **見積管理**
   - `/estimates`
   - `/estimates/new`
   - `/estimates/[id]/page`
   - `/estimates/[id]/edit`

2. **請求管理**
   - `/invoices`
   - `/invoices/new`
   - `/invoices/[id]/page`
   - `/invoices/[id]/edit`

3. **発注書管理**
   - `/purchase-orders`
   - `/purchase-orders/new`
   - `/purchase-orders/[id]/page`
   - `/purchase-orders/[id]/edit`

**カスタムフック**:
```typescript
// hooks/use-estimates.ts
// hooks/use-invoices.ts
// hooks/use-purchase-orders.ts
// hooks/use-invoice-from-estimate.ts - 見積から請求書作成用
// hooks/use-purchase-order-from-estimate.ts - 見積から発注書作成用
```

---

### フェーズ5: 最終調整とドキュメント整備（Week 6）

**目標**: 全体の最適化と完全移行

#### タスク

1. **最適化作業**
   - [ ] キャッシュ戦略の見直し
   - [ ] パフォーマンステスト
   - [ ] 不要なコード削除

2. **ドキュメント整備**
   - [ ] 実装ガイドの完成
   - [ ] トラブルシューティングガイド作成
   - [ ] ベストプラクティス集作成

3. **チームレビュー**
   - [ ] コードレビュー
   - [ ] 動作確認

---

## 実装ガイドライン

### 基本的な移行パターン

#### Before: useEffectパターン

```typescript
const [schedules, setSchedules] = useState([])
const [loading, setLoading] = useState(true)
const [error, setError] = useState("")

useEffect(() => {
  const fetchSchedules = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/schedules')
      const data = await response.json()
      setSchedules(data.schedules)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }
  fetchSchedules()
}, [dependencies])
```

#### After: SWRパターン

```typescript
import useSWR from 'swr'
import { fetcher } from '@/lib/fetcher'

const { data, error, isLoading } = useSWR(
  '/api/schedules',
  fetcher
)

const schedules = data?.schedules || []
```

### ページネーション対応

```typescript
function useSchedulesWithPagination(page: number, limit: number) {
  const { data, error, isLoading } = useSWR(
    `/api/schedules?page=${page}&limit=${limit}`,
    fetcher,
    {
      keepPreviousData: true, // ページ遷移時に前のデータを保持
    }
  )

  return {
    schedules: data?.schedules || [],
    pagination: data?.pagination,
    isLoading,
    isError: error,
  }
}
```

### フィルター対応

```typescript
function useSchedulesWithFilters(filters: ScheduleFilters) {
  // フィルターからクエリパラメータを構築
  const params = new URLSearchParams()
  Object.entries(filters).forEach(([key, value]) => {
    if (value) params.append(key, value)
  })

  const { data, error, isLoading } = useSWR(
    `/api/schedules?${params.toString()}`,
    fetcher
  )

  return { data, error, isLoading }
}
```

### ミューテーション（データ更新）

```typescript
import useSWRMutation from 'swr/mutation'

function useCreateSchedule() {
  const { trigger, isMutating, error } = useSWRMutation(
    '/api/schedules',
    mutationFetcher
  )

  const createSchedule = async (scheduleData: ScheduleData) => {
    const result = await trigger({
      method: 'POST',
      body: scheduleData,
    })

    // 一覧を再検証
    mutate('/api/schedules')

    return result
  }

  return { createSchedule, isMutating, error }
}
```

### 条件付きフェッチ

```typescript
// sessionが存在する場合のみフェッチ
const { data } = useSWR(
  session ? '/api/schedules' : null,
  fetcher
)

// 特定の条件でのみフェッチ
const { data } = useSWR(
  shouldFetch ? '/api/schedules' : null,
  fetcher
)
```

### エラーハンドリング

```typescript
const { data, error, isLoading } = useSWR('/api/schedules', fetcher)

if (error) {
  return <Alert variant="destructive">{error.message}</Alert>
}

if (isLoading) {
  return <Skeleton />
}

return <ScheduleList schedules={data.schedules} />
```

---

## テスト計画

### テスト項目

#### 機能テスト

| テスト項目 | 確認内容 | 期待結果 |
|-----------|---------|---------|
| 初回ロード | ページを開く | データが正常に表示される |
| フィルター適用 | フィルター条件を変更 | 新しいデータが取得される |
| ページネーション | ページを切り替える | 前のデータを保持しながら新データ取得 |
| タブ切り替え | 別タブに移動後、戻る | キャッシュされたデータが表示される（再取得なし） |
| データ更新 | 新規作成/編集/削除 | 一覧が自動的に更新される |
| エラーハンドリング | APIエラー発生 | 適切なエラーメッセージ表示 |
| オフライン | ネットワーク切断 | キャッシュデータが表示される |

#### パフォーマンステスト

| 指標 | 測定方法 | 目標値 |
|-----|---------|-------|
| 初回ロード時間 | Chrome DevTools | 1.5秒以内 |
| タブ切り替え時間 | 手動測定 | 200ms以内（キャッシュヒット） |
| APIリクエスト数 | Network タブ | 移行前の60%以下 |
| メモリ使用量 | Performance Monitor | 移行前と同等 |

#### ブラウザ互換性テスト

- Chrome（最新版）
- Firefox（最新版）
- Safari（最新版）
- Edge（最新版）

---

## リスクと対策

### リスク1: 学習コストの増加

**影響度**: 中
**発生確率**: 高

**対策**:
- 段階的な移行で少しずつ慣れる
- サンプルコード・テンプレートを準備
- ペアプログラミング実施

### リスク2: 既存機能の破壊

**影響度**: 高
**発生確率**: 中

**対策**:
- 各フェーズでの十分なテスト
- フィーチャーフラグによる段階的リリース
- ロールバック計画の準備

### リスク3: キャッシュによる古いデータ表示

**影響度**: 中
**発生確率**: 中

**対策**:
- 適切なキャッシュ戦略の設定
- 重要なデータは手動再検証機能を追加
- ユーザーへの更新通知機能

### リスク4: パフォーマンス劣化

**影響度**: 中
**発生確率**: 低

**対策**:
- 各フェーズでパフォーマンス測定
- 問題があればキャッシュ戦略を調整
- 必要に応じてプリフェッチを導入

### リスク5: 移行期間の長期化

**影響度**: 低
**発生確率**: 中

**対策**:
- 優先度の明確化
- 週次進捗確認
- 必要に応じて優先度の調整

---

## スケジュール

### 全体スケジュール（6週間）

```
Week 1: フェーズ1 - 基盤整備
├─ Day 1-2: SWRインストールと設定
├─ Day 3-4: カスタムフック作成
└─ Day 5: ドキュメント整備

Week 2: フェーズ2-1 - 予定実績管理
├─ Day 1-2: /schedules 移行
├─ Day 3: /schedules/calendar 移行
└─ Day 4-5: /schedules/chart 移行

Week 3: フェーズ2-2/3 - 課題管理・ガントチャート
├─ Day 1-3: /issues 関連移行
├─ Day 4: /gantt 移行
└─ Day 5: /projects 移行

Week 4: フェーズ3 - マスタ管理
├─ Day 1-2: 顧客管理移行
├─ Day 3: ユーザー管理移行
├─ Day 4: 部署管理移行
└─ Day 5: 会社設定移行

Week 5: フェーズ4 - 取引管理
├─ Day 1-2: 見積管理移行
├─ Day 2-3: 請求管理移行
└─ Day 4-5: 発注書管理移行

Week 6: フェーズ5 - 最終調整
├─ Day 1-2: 最適化作業
├─ Day 3-4: ドキュメント整備
└─ Day 5: 全体レビュー
```

### マイルストーン

| 日付 | マイルストーン | 成果物 |
|-----|--------------|--------|
| Week 1 終了 | SWR基盤完成 | 設定ファイル、カスタムフック基礎 |
| Week 2 終了 | コア機能移行完了 | 予定実績管理のSWR化 |
| Week 3 終了 | 主要機能移行完了 | 課題・ガント・案件のSWR化 |
| Week 4 終了 | マスタ機能移行完了 | 顧客・ユーザー・部署のSWR化 |
| Week 5 終了 | 全機能移行完了 | 取引系のSWR化 |
| Week 6 終了 | プロジェクト完了 | 最適化済み、ドキュメント完備 |

---

## 追加で必要なカスタムフック一覧

移行計画の精査により、以下のカスタムフックが追加で必要と判明しました：

### データ取得系

| フック名 | 用途 | 優先度 |
|---------|------|--------|
| `use-schedule-by-date.ts` | 特定日付のスケジュール取得 | 中 |
| `use-issue-comments.ts` | 課題のコメント取得 | 高 |
| `use-evm-analysis.ts` | EVM分析データ取得 | 中 |
| `use-company.ts` | 会社情報取得 | 中 |

### ミューテーション系

| フック名 | 用途 | 優先度 |
|---------|------|--------|
| `use-invoice-from-estimate.ts` | 見積から請求書作成 | 低 |
| `use-purchase-order-from-estimate.ts` | 見積から発注書作成 | 低 |
| `use-invoice-status.ts` | 請求書ステータス更新 | 低 |
| `use-purchase-order-status.ts` | 発注書ステータス更新 | 低 |

### SWR対象外のAPI

以下のAPIはSWRの対象外とします：

| API | 理由 |
|-----|------|
| `/api/*/pdf` | PDF生成・ダウンロード処理 |
| `/api/*/duplicate` | 複製処理（ミューテーションとして別途実装） |
| `/api/*/seal` | 画像ファイルアップロード処理 |

---

## 参考資料

### 公式ドキュメント
- [SWR公式ドキュメント](https://swr.vercel.app/)
- [SWR Examples](https://swr.vercel.app/examples)

### 関連ファイル
- `lib/swr-config.ts` - SWR設定
- `lib/fetcher.ts` - カスタムFetcher
- `hooks/` - カスタムフックディレクトリ

### 問い合わせ
プロジェクトに関する質問や問題があれば、開発チームに連絡してください。

---

**最終更新**: 2025-10-08
**バージョン**: 1.1
**作成者**: Development Team

## 変更履歴

### v1.1 (2025-10-08)
- 会社設定ページ（`/settings/company`）を追加
- 全ての新規作成ページ（new）を明示的に追加
- EVM分析ページを優先度4に統合
- 追加で必要なカスタムフック一覧セクションを追加
- 課題コメント、特定日付スケジュール、EVM分析、会社情報取得のカスタムフックを追加
- ミューテーション系フック（見積からの変換、ステータス更新）を追加
- SWR対象外API（PDF生成、複製、画像アップロード）を明記

### v1.0 (2025-10-08)
- 初版作成
