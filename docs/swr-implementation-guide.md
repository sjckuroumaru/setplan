# SWR実装ガイド

## 目次
1. [セットアップ](#セットアップ)
2. [基本パターン](#基本パターン)
3. [カスタムフック実装例](#カスタムフック実装例)
4. [ベストプラクティス](#ベストプラクティス)
5. [トラブルシューティング](#トラブルシューティング)

---

## セットアップ

### 1. インストール

```bash
npm install swr
```

### 2. グローバル設定ファイル作成

#### `lib/swr-config.ts`

```typescript
import { SWRConfiguration } from 'swr'

export const swrConfig: SWRConfiguration = {
  // フォーカス時の再検証を無効化（タブ切り替え時の再取得を防ぐ）
  revalidateOnFocus: false,

  // 再接続時は再検証
  revalidateOnReconnect: true,

  // データが古い場合は再検証
  revalidateIfStale: true,

  // 5秒以内の重複リクエストを防ぐ
  dedupingInterval: 5000,

  // エラー時のリトライ設定
  shouldRetryOnError: true,
  errorRetryCount: 3,
  errorRetryInterval: 5000,

  // Suspenseモードは使用しない
  suspense: false,
}
```

#### `lib/fetcher.ts`

```typescript
/**
 * SWR用のGETリクエストfetcher
 */
export async function fetcher<T>(url: string): Promise<T> {
  const response = await fetch(url)

  if (!response.ok) {
    const error = await response.json().catch(() => ({
      error: 'Network error',
    }))
    throw new Error(error.error || `API Error: ${response.status}`)
  }

  return response.json()
}

/**
 * POST/PUT/DELETE用のmutation fetcher
 */
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
    const error = await response.json().catch(() => ({
      error: 'Network error',
    }))
    throw new Error(error.error || `API Error: ${response.status}`)
  }

  return response.json()
}
```

### 3. ルートレイアウトにSWRConfigを追加

#### `app/layout.tsx`

```typescript
import { SWRConfig } from 'swr'
import { swrConfig } from '@/lib/swr-config'
import { fetcher } from '@/lib/fetcher'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja">
      <body>
        <SWRConfig
          value={{
            ...swrConfig,
            fetcher, // デフォルトのfetcherを設定
          }}
        >
          {children}
        </SWRConfig>
      </body>
    </html>
  )
}
```

---

## 基本パターン

### パターン1: シンプルなデータ取得

```typescript
import useSWR from 'swr'

function SchedulesPage() {
  const { data, error, isLoading } = useSWR('/api/schedules')

  if (error) return <div>エラーが発生しました</div>
  if (isLoading) return <div>読み込み中...</div>

  return <div>{data.schedules.map(...)}</div>
}
```

### パターン2: パラメータ付きリクエスト

```typescript
function SchedulesPage() {
  const [page, setPage] = useState(1)
  const [limit] = useState(30)

  const { data, error, isLoading } = useSWR(
    `/api/schedules?page=${page}&limit=${limit}`
  )

  // ページ変更時、自動的に新しいURLでフェッチされる
  const handlePageChange = (newPage: number) => {
    setPage(newPage)
  }

  return (
    <div>
      {data?.schedules.map(...)}
      <Pagination page={page} onChange={handlePageChange} />
    </div>
  )
}
```

### パターン3: 条件付きフェッチ

```typescript
function SchedulesPage() {
  const { data: session } = useSession()

  // sessionが存在する場合のみフェッチ
  const { data, error, isLoading } = useSWR(
    session ? '/api/schedules' : null
  )

  if (!session) return <div>ログインしてください</div>
  if (error) return <div>エラーが発生しました</div>
  if (isLoading) return <div>読み込み中...</div>

  return <div>{data.schedules.map(...)}</div>
}
```

### パターン4: 複数の並列リクエスト

```typescript
function DashboardPage() {
  const { data: schedules, error: schedulesError } = useSWR('/api/schedules')
  const { data: issues, error: issuesError } = useSWR('/api/issues')
  const { data: projects, error: projectsError } = useSWR('/api/projects')

  // すべてのデータが揃うまで待つ
  const isLoading = !schedules || !issues || !projects
  const hasError = schedulesError || issuesError || projectsError

  if (hasError) return <div>エラーが発生しました</div>
  if (isLoading) return <div>読み込み中...</div>

  return (
    <div>
      <SchedulesSummary data={schedules} />
      <IssuesSummary data={issues} />
      <ProjectsSummary data={projects} />
    </div>
  )
}
```

---

## カスタムフック実装例

### 例1: 予定実績管理用フック

#### `hooks/use-schedules.ts`

```typescript
import useSWR from 'swr'
import { fetcher } from '@/lib/fetcher'

interface UseSchedulesParams {
  page: number
  limit: number
  userId?: string
  departmentId?: string
  startDate?: string
  endDate?: string
  searchQuery?: string
}

interface Schedule {
  id: string
  userId: string
  scheduleDate: string
  // ... その他のフィールド
}

interface SchedulesResponse {
  schedules: Schedule[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export function useSchedules(params: UseSchedulesParams) {
  // クエリパラメータの構築
  const queryParams = new URLSearchParams({
    page: params.page.toString(),
    limit: params.limit.toString(),
  })

  if (params.userId) queryParams.append('userId', params.userId)
  if (params.departmentId) queryParams.append('departmentId', params.departmentId)
  if (params.startDate) queryParams.append('startDate', params.startDate)
  if (params.endDate) queryParams.append('endDate', params.endDate)
  if (params.searchQuery) queryParams.append('search', params.searchQuery)

  const { data, error, isLoading, mutate } = useSWR<SchedulesResponse>(
    `/api/schedules?${queryParams}`,
    fetcher,
    {
      // 前のデータを保持（ページ遷移時にちらつき防止）
      keepPreviousData: true,
      // このページ専用の設定があれば追加
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

#### 使用例

```typescript
function SchedulesPage() {
  const { data: session } = useSession()
  const [page, setPage] = useState(1)
  const [userFilter, setUserFilter] = useState('all')
  const [departmentFilter, setDepartmentFilter] = useState('all')

  const { schedules, pagination, isLoading, isError, mutate } = useSchedules({
    page,
    limit: 30,
    userId: userFilter !== 'all' ? userFilter : undefined,
    departmentId: departmentFilter !== 'all' ? departmentFilter : undefined,
  })

  // データを手動で再取得
  const handleRefresh = () => {
    mutate()
  }

  if (isError) return <Alert variant="destructive">エラーが発生しました</Alert>
  if (isLoading) return <Skeleton />

  return (
    <div>
      <Button onClick={handleRefresh}>更新</Button>
      <SchedulesList schedules={schedules} />
      <Pagination
        page={page}
        totalPages={pagination?.totalPages || 1}
        onPageChange={setPage}
      />
    </div>
  )
}
```

### 例2: 課題管理用フック

#### `hooks/use-issues.ts`

```typescript
import useSWR from 'swr'
import { fetcher } from '@/lib/fetcher'

interface UseIssuesParams {
  page: number
  limit: number
  status?: string
  priority?: string
  projectId?: string
  assigneeId?: string
  departmentId?: string
  searchQuery?: string
}

export function useIssues(params: UseIssuesParams) {
  const queryParams = new URLSearchParams({
    page: params.page.toString(),
    limit: params.limit.toString(),
  })

  if (params.status && params.status !== 'all') {
    queryParams.append('status', params.status)
  }
  if (params.priority && params.priority !== 'all') {
    queryParams.append('priority', params.priority)
  }
  if (params.projectId && params.projectId !== 'all') {
    queryParams.append('projectId', params.projectId)
  }
  if (params.assigneeId && params.assigneeId !== 'all') {
    queryParams.append('assigneeId', params.assigneeId)
  }
  if (params.departmentId && params.departmentId !== 'all') {
    queryParams.append('departmentId', params.departmentId)
  }
  if (params.searchQuery) {
    queryParams.append('search', params.searchQuery)
  }

  const { data, error, isLoading, mutate } = useSWR(
    `/api/issues?${queryParams}`,
    fetcher,
    {
      keepPreviousData: true,
      revalidateOnFocus: false,
    }
  )

  return {
    issues: data?.issues || [],
    stats: data?.stats,
    pagination: data?.pagination,
    isLoading,
    isError: error,
    mutate,
  }
}
```

### 例3: 詳細ページ用フック

#### `hooks/use-issue-detail.ts`

```typescript
import useSWR from 'swr'
import { fetcher } from '@/lib/fetcher'

export function useIssueDetail(issueId: string | null) {
  const { data, error, isLoading, mutate } = useSWR(
    issueId ? `/api/issues/${issueId}` : null,
    fetcher,
    {
      // 詳細ページはキャッシュを長めに保持
      dedupingInterval: 10000,
      revalidateOnFocus: false,
    }
  )

  return {
    issue: data?.issue,
    isLoading,
    isError: error,
    mutate,
  }
}
```

### 例4: ミューテーション（データ更新）用フック

#### `hooks/use-schedule-mutations.ts`

```typescript
import useSWRMutation from 'swr/mutation'
import { mutate } from 'swr'

interface ScheduleData {
  scheduleDate: string
  userId?: string
  checkInTime?: string
  checkOutTime?: string
  plans: any[]
  actuals: any[]
}

async function createScheduleFetcher(
  url: string,
  { arg }: { arg: ScheduleData }
) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(arg),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || '作成に失敗しました')
  }

  return response.json()
}

async function updateScheduleFetcher(
  url: string,
  { arg }: { arg: ScheduleData }
) {
  const response = await fetch(url, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(arg),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || '更新に失敗しました')
  }

  return response.json()
}

async function deleteScheduleFetcher(url: string) {
  const response = await fetch(url, { method: 'DELETE' })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || '削除に失敗しました')
  }

  return response.json()
}

export function useScheduleMutations() {
  const { trigger: createTrigger, isMutating: isCreating } = useSWRMutation(
    '/api/schedules',
    createScheduleFetcher
  )

  const createSchedule = async (data: ScheduleData) => {
    const result = await createTrigger(data)
    // 一覧を再検証
    mutate(key => typeof key === 'string' && key.startsWith('/api/schedules'))
    return result
  }

  const updateSchedule = async (id: string, data: ScheduleData) => {
    const response = await updateScheduleFetcher(`/api/schedules/${id}`, {
      arg: data,
    })
    // 詳細と一覧を再検証
    mutate(`/api/schedules/${id}`)
    mutate(key => typeof key === 'string' && key.startsWith('/api/schedules?'))
    return response
  }

  const deleteSchedule = async (id: string) => {
    const response = await deleteScheduleFetcher(`/api/schedules/${id}`)
    // 一覧を再検証
    mutate(key => typeof key === 'string' && key.startsWith('/api/schedules?'))
    return response
  }

  return {
    createSchedule,
    updateSchedule,
    deleteSchedule,
    isCreating,
  }
}
```

#### 使用例

```typescript
function ScheduleForm() {
  const router = useRouter()
  const { createSchedule, isCreating } = useScheduleMutations()

  const handleSubmit = async (data: ScheduleData) => {
    try {
      await createSchedule(data)
      toast.success('予定実績を作成しました')
      router.push('/schedules')
    } catch (error) {
      toast.error(error.message)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      {/* フォームフィールド */}
      <Button type="submit" disabled={isCreating}>
        {isCreating ? '作成中...' : '作成'}
      </Button>
    </form>
  )
}
```

---

## ベストプラクティス

### 1. カスタムフックの命名規則

```typescript
// ✅ Good: 用途が明確
useSchedules()
useIssues()
useIssueDetail()
useScheduleMutations()

// ❌ Bad: 用途が不明確
useData()
useFetch()
useAPI()
```

### 2. エラーハンドリング

```typescript
function SchedulesPage() {
  const { schedules, isLoading, isError } = useSchedules({ page: 1, limit: 30 })

  // エラー状態を最初にチェック
  if (isError) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          データの取得に失敗しました。再度お試しください。
        </AlertDescription>
      </Alert>
    )
  }

  // ローディング状態
  if (isLoading) {
    return <Skeleton className="h-96" />
  }

  // データが空の場合
  if (schedules.length === 0) {
    return <EmptyState />
  }

  // 正常なデータ表示
  return <SchedulesList schedules={schedules} />
}
```

### 3. キャッシュキーの一貫性

```typescript
// ✅ Good: 一貫したキー構造
const CACHE_KEYS = {
  schedules: (params: ScheduleParams) =>
    `/api/schedules?${new URLSearchParams(params).toString()}`,
  scheduleDetail: (id: string) => `/api/schedules/${id}`,
  issues: (params: IssueParams) =>
    `/api/issues?${new URLSearchParams(params).toString()}`,
}

// 使用例
useSWR(CACHE_KEYS.schedules({ page: 1, limit: 30 }))
useSWR(CACHE_KEYS.scheduleDetail(id))

// ❌ Bad: バラバラなキー構造
useSWR('/api/schedules?page=1&limit=30')
useSWR(`/api/schedules/${id}`)
useSWR('/api/issues/' + id) // 混在している
```

### 4. オプティミスティックUI

```typescript
function useOptimisticScheduleUpdate() {
  const { data, mutate } = useSWR('/api/schedules')

  const updateSchedule = async (id: string, updates: Partial<Schedule>) => {
    // 楽観的更新（即座にUIを更新）
    const optimisticData = {
      ...data,
      schedules: data.schedules.map((s: Schedule) =>
        s.id === id ? { ...s, ...updates } : s
      ),
    }

    // UIを即座に更新（revalidate: false）
    mutate(optimisticData, false)

    try {
      // 実際のAPI呼び出し
      const result = await fetch(`/api/schedules/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
      })

      // 成功したらサーバーデータで再検証
      mutate()
    } catch (error) {
      // エラー時は元のデータに戻す
      mutate()
      throw error
    }
  }

  return { updateSchedule }
}
```

### 5. 依存データのプリフェッチ

```typescript
function ScheduleFormPage() {
  const { data: session } = useSession()

  // ユーザーがログインしていればプロジェクトをプリフェッチ
  useSWR(session ? '/api/projects?activeOnly=true' : null)

  // フォーム表示時にはすでにキャッシュされている
  return <ScheduleForm />
}
```

### 6. 条件付き再検証

```typescript
function useSchedulesWithConditionalRevalidation() {
  const [shouldRevalidate, setShouldRevalidate] = useState(false)

  const { data, mutate } = useSWR('/api/schedules', fetcher, {
    revalidateOnFocus: shouldRevalidate,
    revalidateOnReconnect: shouldRevalidate,
  })

  // 重要な操作後は再検証を有効化
  const enableRevalidation = () => setShouldRevalidate(true)
  const disableRevalidation = () => setShouldRevalidate(false)

  return {
    data,
    mutate,
    enableRevalidation,
    disableRevalidation,
  }
}
```

---

## トラブルシューティング

### 問題1: データが更新されない

**症状**: データを更新したのに画面に反映されない

**原因**: mutateを呼び出していない

**解決策**:
```typescript
// ❌ Bad
const response = await fetch('/api/schedules', { method: 'POST', ... })

// ✅ Good
const response = await fetch('/api/schedules', { method: 'POST', ... })
mutate('/api/schedules') // 一覧を再検証
```

### 問題2: 無限ループが発生

**症状**: APIリクエストが無限に繰り返される

**原因**: 依存配列の誤った使用

**解決策**:
```typescript
// ❌ Bad: オブジェクトを直接渡すと毎回新しい参照になる
const params = { page: 1, limit: 30 }
useSWR(`/api/schedules?${JSON.stringify(params)}`)

// ✅ Good: URLSearchParamsを使う
const queryString = new URLSearchParams({ page: '1', limit: '30' }).toString()
useSWR(`/api/schedules?${queryString}`)

// ✅ Better: カスタムフックで安全に処理
function useSchedules(params: ScheduleParams) {
  const key = useMemo(
    () => `/api/schedules?${new URLSearchParams(params).toString()}`,
    [params.page, params.limit] // 必要な依存のみ指定
  )
  return useSWR(key)
}
```

### 問題3: タブ切り替え時に再取得される

**症状**: タブを切り替えるとデータが再取得される

**原因**: revalidateOnFocusがtrueになっている

**解決策**:
```typescript
// グローバル設定で無効化
// lib/swr-config.ts
export const swrConfig = {
  revalidateOnFocus: false,
}

// または個別に無効化
useSWR('/api/schedules', fetcher, {
  revalidateOnFocus: false,
})
```

### 問題4: エラーが正しく表示されない

**症状**: エラーが発生してもエラーメッセージが表示されない

**原因**: fetcherでエラーをthrowしていない

**解決策**:
```typescript
// ❌ Bad
export async function fetcher(url: string) {
  const response = await fetch(url)
  return response.json() // エラーをチェックしていない
}

// ✅ Good
export async function fetcher(url: string) {
  const response = await fetch(url)

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'API Error')
  }

  return response.json()
}
```

### 問題5: キャッシュが古いまま

**症状**: データを更新したのに古いデータが表示される

**原因**: 関連するキャッシュを更新していない

**解決策**:
```typescript
// ❌ Bad: 特定のキーのみ更新
mutate('/api/schedules?page=1&limit=30')

// ✅ Good: パターンマッチで関連キーを全て更新
mutate(
  key => typeof key === 'string' && key.startsWith('/api/schedules'),
  undefined,
  { revalidate: true }
)

// または専用の関数を作成
function revalidateSchedules() {
  mutate(key => typeof key === 'string' && key.startsWith('/api/schedules'))
}
```

### 問題6: TypeScriptの型エラー

**症状**: SWRの戻り値の型が正しく推論されない

**解決策**:
```typescript
// ✅ Good: 明示的に型を指定
interface SchedulesResponse {
  schedules: Schedule[]
  pagination: Pagination
}

const { data, error } = useSWR<SchedulesResponse>('/api/schedules', fetcher)

// dataの型は SchedulesResponse | undefined
// data.schedules は安全にアクセス可能（オプショナルチェーン使用）
```

---

## チェックリスト

移行時に確認すべき項目：

### 実装前
- [ ] SWRをインストールした
- [ ] グローバル設定ファイルを作成した
- [ ] fetcherを作成した
- [ ] SWRConfigプロバイダーを追加した

### 実装中
- [ ] カスタムフックを作成した
- [ ] エラーハンドリングを実装した
- [ ] ローディング状態を処理した
- [ ] 条件付きフェッチを正しく実装した
- [ ] mutateで適切にキャッシュを更新している

### 実装後
- [ ] タブ切り替え時に不要な再取得がないことを確認
- [ ] エラー時に適切なメッセージが表示される
- [ ] データ更新時に画面が正しく更新される
- [ ] パフォーマンスが改善された
- [ ] TypeScriptの型エラーがない

---

**最終更新**: 2025-10-08
**バージョン**: 1.0
