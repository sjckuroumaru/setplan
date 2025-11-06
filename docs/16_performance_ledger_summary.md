# 実績台帳サマリ機能 設計書

## 1. 概要

実績台帳サマリ機能は、実績台帳データを集計して全体およびチーム別の売上・粗利を可視化する機能です。
実績台帳画面の上部に表示され、事業全体の収益状況とチームごとのパフォーマンスを一目で把握できるようにします。

### 1.1 主要な機能

| 機能 | 説明 |
|------|------|
| 全体サマリ | 表示中のデータ全体の売上・粗利を集計表示 |
| チーム別サマリ | チームごとの売上・粗利を集計表示 |
| フィルター連動 | 実績台帳のフィルターに連動して集計値を更新 |
| 視覚的表現 | 粗利率に応じた色分け表示 |

## 2. 表示項目

### 2.1 全体サマリ

実績台帳画面の上部に表示するカード形式のサマリ：

| 項目名 | 計算式 | 表示形式 | 備考 |
|--------|--------|---------|------|
| 案件数 | フィルター適用後の案件数 | `XX 件` | 表示中の総案件数 |
| 総発注金額 | Σ発注金額 | `¥XX,XXX,XXX` | 売上合計 |
| 総外注費 | Σ外注費 | `¥XX,XXX,XXX` | 外注費合計 |
| 総サーバー・ドメイン代 | Σサーバー・ドメイン代 | `¥XX,XXX,XXX` | インフラ費用合計 |
| 総投下工数 | Σ投下工数 | `¥XX,XXX,XXX` | 人件費合計 |
| 総粗利 | 総発注金額 - 総外注費 - 総サーバー・ドメイン代 - 総投下工数 | `¥XX,XXX,XXX` | 利益合計（マイナスは赤字表示） |
| 平均粗利率 | (総粗利 ÷ 総発注金額) × 100 | `XX.X%` | 全体の収益性（色分け表示） |

**レイアウト例**：
```
┌─────────────────────────────────────────────────────────────┐
│ 全体サマリ                                                    │
├─────────────────────────────────────────────────────────────┤
│ 案件数: 45件                                                  │
│                                                              │
│ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐      │
│ │ 総発注金額 │ │  総外注費 │ │ サーバー代│ │ 総投下工数│      │
│ │ ¥50,000,000│ │¥5,000,000│ │¥1,000,000│ │¥20,000,000│      │
│ └──────────┘ └──────────┘ └──────────┘ └──────────┘      │
│                                                              │
│ ┌──────────┐ ┌──────────┐                                  │
│ │  総粗利   │ │ 平均粗利率│                                  │
│ │¥24,000,000│ │   48.0%  │ (緑色で表示)                     │
│ └──────────┘ └──────────┘                                  │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 チーム別サマリ

全体サマリの下に表示するテーブル形式のサマリ：

| 列名 | 計算式 | 表示形式 | 備考 |
|------|--------|---------|------|
| チーム名 | Project.department.name | テキスト | チーム未設定は「未割当」と表示 |
| 案件数 | チームごとの案件数 | `XX 件` | 件数 |
| 発注金額 | チームごとのΣ発注金額 | `¥XX,XXX,XXX` | 売上 |
| 外注費 | チームごとのΣ外注費 | `¥XX,XXX,XXX` | 外注費 |
| サーバー・ドメイン代 | チームごとのΣサーバー・ドメイン代 | `¥XX,XXX,XXX` | インフラ費 |
| 投下工数 | チームごとのΣ投下工数 | `¥XX,XXX,XXX` | 人件費 |
| 粗利 | 発注金額 - 外注費 - サーバー・ドメイン代 - 投下工数 | `¥XX,XXX,XXX` | 利益（マイナスは赤字表示） |
| 粗利率 | (粗利 ÷ 発注金額) × 100 | `XX.X%` | 収益性（色分け表示） |
| 構成比 | (チーム発注金額 ÷ 総発注金額) × 100 | `XX.X%` | 売上構成比 |

**レイアウト例**：
```
┌──────────────────────────────────────────────────────────────────────┐
│ チーム別サマリ                                                         │
├──────────┬──────┬───────────┬─────────┬────────┬─────────┬─────────┤
│ チーム名  │案件数│ 発注金額   │ 粗利     │ 粗利率  │ 構成比  │         │
├──────────┼──────┼───────────┼─────────┼────────┼─────────┼─────────┤
│ 開発1課   │  15  │¥20,000,000│¥10,000,000│ 50.0% │  40.0%  │ 展開 ▼  │
│ 開発2課   │  12  │¥15,000,000│ ¥6,000,000│ 40.0% │  30.0%  │ 展開 ▼  │
│ 保守課    │  10  │¥10,000,000│ ¥5,000,000│ 50.0% │  20.0%  │ 展開 ▼  │
│ 未割当    │   8  │ ¥5,000,000│ ¥3,000,000│ 60.0% │  10.0%  │ 展開 ▼  │
├──────────┼──────┼───────────┼─────────┼────────┼─────────┼─────────┤
│ 合計      │  45  │¥50,000,000│¥24,000,000│ 48.0% │ 100.0%  │         │
└──────────┴──────┴───────────┴─────────┴────────┴─────────┴─────────┘
```

### 2.3 チーム別詳細（展開表示）

各チーム行をクリックすると詳細情報を展開表示：

| 項目名 | 説明 |
|--------|------|
| 外注費 | チームの外注費合計 |
| サーバー・ドメイン代 | チームのサーバー・ドメイン代合計 |
| 投下工数 | チームの投下工数合計 |
| 平均案件単価 | 発注金額 ÷ 案件数 |
| 平均粗利 | 粗利 ÷ 案件数 |

## 3. カラースキーマ

### 3.1 粗利率の色分け

実績台帳本体と同じ色分けルールを適用：

| 粗利率 | 背景色 | 文字色 | Tailwind クラス | 評価 |
|--------|--------|--------|----------------|------|
| 50%以上 | 濃い緑 | 白 | `bg-green-600 text-white` | 優秀 |
| 30-50% | 緑 | 白 | `bg-green-500 text-white` | 優良 |
| 10-30% | 黄 | 黒 | `bg-yellow-400 text-black` | 標準 |
| 0-10% | オレンジ | 白 | `bg-orange-500 text-white` | 要改善 |
| マイナス | 赤 | 白 | `bg-red-600 text-white` | 赤字 |

## 4. API設計

### 4.1 サマリデータ取得API

**エンドポイント**: `GET /api/performance-ledger/summary`

**クエリパラメータ**:
実績台帳と同じフィルターパラメータを受け付ける：
- `projectType`: 種別でフィルター（オプション）
- `status`: ステータスでフィルター（オプション）
- `departmentId`: チームでフィルター（オプション）
- `startDate`: 発行日の開始日でフィルター（オプション）
- `endDate`: 発行日の終了日でフィルター（オプション）

**レスポンス**:
```typescript
{
  overall: {
    projectCount: number            // 案件数
    totalOrderAmount: number        // 総発注金額
    totalOutsourcingCost: number    // 総外注費
    totalServerDomainCost: number   // 総サーバー・ドメイン代
    totalLaborCost: number          // 総投下工数
    totalGrossProfit: number        // 総粗利
    averageGrossProfitRate: number  // 平均粗利率（%）
  },
  byTeam: [
    {
      departmentId: string | null       // チームID（未割当はnull）
      departmentName: string            // チーム名（未割当は「未割当」）
      projectCount: number              // 案件数
      orderAmount: number               // 発注金額
      outsourcingCost: number           // 外注費
      serverDomainCost: number          // サーバー・ドメイン代
      laborCost: number                 // 投下工数
      grossProfit: number               // 粗利
      grossProfitRate: number           // 粗利率（%）
      compositionRate: number           // 構成比（%）
      averageOrderAmount: number        // 平均案件単価
      averageGrossProfit: number        // 平均粗利
    }
  ]
}
```

**計算ロジック**:
```typescript
// 全体サマリ
const overall = {
  projectCount: filteredProjects.length,
  totalOrderAmount: sum(filteredProjects.map(p => p.orderAmount)),
  totalOutsourcingCost: sum(filteredProjects.map(p => p.outsourcingCost)),
  totalServerDomainCost: sum(filteredProjects.map(p => p.serverDomainCost)),
  totalLaborCost: sum(filteredProjects.map(p => p.laborCost)),
  totalGrossProfit: 0, // 後で計算
  averageGrossProfitRate: 0, // 後で計算
}

overall.totalGrossProfit =
  overall.totalOrderAmount -
  overall.totalOutsourcingCost -
  overall.totalServerDomainCost -
  overall.totalLaborCost

overall.averageGrossProfitRate =
  overall.totalOrderAmount > 0
    ? (overall.totalGrossProfit / overall.totalOrderAmount) * 100
    : 0

// チーム別サマリ
const byTeam = groupBy(filteredProjects, 'departmentId').map(group => {
  const orderAmount = sum(group.projects.map(p => p.orderAmount))
  const outsourcingCost = sum(group.projects.map(p => p.outsourcingCost))
  const serverDomainCost = sum(group.projects.map(p => p.serverDomainCost))
  const laborCost = sum(group.projects.map(p => p.laborCost))
  const grossProfit = orderAmount - outsourcingCost - serverDomainCost - laborCost
  const grossProfitRate = orderAmount > 0 ? (grossProfit / orderAmount) * 100 : 0
  const compositionRate = overall.totalOrderAmount > 0 ? (orderAmount / overall.totalOrderAmount) * 100 : 0

  return {
    departmentId: group.departmentId,
    departmentName: group.departmentName || '未割当',
    projectCount: group.projects.length,
    orderAmount,
    outsourcingCost,
    serverDomainCost,
    laborCost,
    grossProfit,
    grossProfitRate,
    compositionRate,
    averageOrderAmount: orderAmount / group.projects.length,
    averageGrossProfit: grossProfit / group.projects.length,
  }
})

// チームを発注金額の降順でソート
byTeam.sort((a, b) => b.orderAmount - a.orderAmount)
```

### 4.2 パフォーマンス最適化

サマリAPIは実績台帳APIと同じクエリを使用しますが、集計のみを返すため高速に動作します。

**最適化ポイント**:
1. 必要なフィールドのみをSELECT（全フィールドは不要）
2. 集計はデータベース側で実行（`GROUP BY`、`SUM`、`COUNT`）
3. 実績台帳APIとキャッシュを共有可能（SWRのキャッシュキーを工夫）

**SQLクエリ例**:
```sql
-- 全体サマリ
SELECT
  COUNT(*) as projectCount,
  SUM(order_amount) as totalOrderAmount,
  SUM(outsourcing_cost) as totalOutsourcingCost,
  SUM(server_domain_cost) as totalServerDomainCost,
  SUM(total_labor_cost) as totalLaborCost
FROM performance_ledger_view
WHERE [フィルター条件]

-- チーム別サマリ
SELECT
  department_id,
  department_name,
  COUNT(*) as projectCount,
  SUM(order_amount) as orderAmount,
  SUM(outsourcing_cost) as outsourcingCost,
  SUM(server_domain_cost) as serverDomainCost,
  SUM(total_labor_cost) as laborCost
FROM performance_ledger_view
WHERE [フィルター条件]
GROUP BY department_id, department_name
ORDER BY orderAmount DESC
```

## 5. UI設計

### 5.1 レイアウト構成

```
┌─────────────────────────────────────────────────────────┐
│ 実績台帳                                                 │
├─────────────────────────────────────────────────────────┤
│                                                          │
│ [全体サマリカード]                                       │
│  - 案件数、総発注金額、総粗利、平均粗利率など             │
│                                                          │
│ [チーム別サマリテーブル]                                 │
│  - チーム名、案件数、発注金額、粗利、粗利率など           │
│                                                          │
│ ───────────────────────────────────────────────────     │
│                                                          │
│ [フィルター]                                             │
│  種別: [すべて▼] ステータス: [完了以外▼] ...            │
│                                                          │
│ [実績台帳テーブル]                                       │
│  案件番号 | 案件名 | 発行日 | ... | 粗利 | 粗利率        │
│  ─────────────────────────────────────────────          │
│  P-001   | XX案件 | 2025-01 | ... | ¥500万 | 25.0%      │
│  ...                                                     │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### 5.2 レスポンシブ対応

**デスクトップ（1024px以上）**:
- 全体サマリは4列グリッドで表示
- チーム別サマリは横スクロール可能なテーブル

**タブレット（768px-1023px）**:
- 全体サマリは2列グリッドで表示
- チーム別サマリは横スクロール可能なテーブル

**モバイル（767px以下）**:
- 全体サマリは1列で縦積み表示
- チーム別サマリはカード形式に切り替え

### 5.3 インタラクション

**展開・折りたたみ**:
- チーム別サマリの各行はクリックで詳細を展開
- 展開時はアニメーション付きで詳細情報を表示
- 再クリックで折りたたみ

**ソート**:
- チーム別サマリの各列見出しをクリックでソート
- 初期表示は発注金額の降順

**フィルター連動**:
- 実績台帳のフィルター変更時、サマリも自動更新
- ローディング状態を表示

## 6. コンポーネント設計

### 6.1 コンポーネント構成

```
performance-ledger/
├── page.tsx                        // メインページ
├── components/
│   ├── summary/
│   │   ├── overall-summary.tsx     // 全体サマリカード
│   │   ├── team-summary-table.tsx  // チーム別サマリテーブル
│   │   ├── team-summary-row.tsx    // チーム別サマリ行（展開可能）
│   │   └── summary-skeleton.tsx    // ローディング用スケルトン
│   ├── filters/
│   │   └── ledger-filters.tsx      // フィルターコンポーネント
│   └── table/
│       └── ledger-table.tsx         // 実績台帳テーブル
└── hooks/
    ├── use-performance-ledger.ts    // 実績台帳データ取得フック
    └── use-ledger-summary.ts        // サマリデータ取得フック
```

### 6.2 Reactコンポーネント例

**全体サマリカード**:
```tsx
interface OverallSummaryProps {
  data: {
    projectCount: number
    totalOrderAmount: number
    totalOutsourcingCost: number
    totalServerDomainCost: number
    totalLaborCost: number
    totalGrossProfit: number
    averageGrossProfitRate: number
  }
  isLoading?: boolean
}

export function OverallSummary({ data, isLoading }: OverallSummaryProps) {
  if (isLoading) {
    return <SummarySkeleton />
  }

  const profitRateColor = getProfitRateColor(data.averageGrossProfitRate)

  return (
    <Card>
      <CardHeader>
        <CardTitle>全体サマリ</CardTitle>
        <CardDescription>
          表示中の{data.projectCount}件の案件の集計結果
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <SummaryItem
            label="総発注金額"
            value={formatCurrency(data.totalOrderAmount)}
            icon={<DollarSign />}
          />
          <SummaryItem
            label="総外注費"
            value={formatCurrency(data.totalOutsourcingCost)}
            icon={<Users />}
          />
          <SummaryItem
            label="総サーバー・ドメイン代"
            value={formatCurrency(data.totalServerDomainCost)}
            icon={<Server />}
          />
          <SummaryItem
            label="総投下工数"
            value={formatCurrency(data.totalLaborCost)}
            icon={<Clock />}
          />
        </div>
        <Separator className="my-4" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SummaryItem
            label="総粗利"
            value={formatCurrency(data.totalGrossProfit)}
            valueClassName={data.totalGrossProfit < 0 ? 'text-red-600' : 'text-green-600'}
            icon={<TrendingUp />}
            large
          />
          <SummaryItem
            label="平均粗利率"
            value={`${data.averageGrossProfitRate.toFixed(1)}%`}
            valueClassName={profitRateColor}
            icon={<Percent />}
            large
          />
        </div>
      </CardContent>
    </Card>
  )
}
```

**チーム別サマリテーブル**:
```tsx
interface TeamSummaryTableProps {
  data: Array<{
    departmentId: string | null
    departmentName: string
    projectCount: number
    orderAmount: number
    outsourcingCost: number
    serverDomainCost: number
    laborCost: number
    grossProfit: number
    grossProfitRate: number
    compositionRate: number
    averageOrderAmount: number
    averageGrossProfit: number
  }>
  isLoading?: boolean
}

export function TeamSummaryTable({ data, isLoading }: TeamSummaryTableProps) {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())
  const [sortConfig, setSortConfig] = useState({ key: 'orderAmount', order: 'desc' })

  const toggleRow = (departmentId: string | null) => {
    const key = departmentId || 'unassigned'
    setExpandedRows(prev => {
      const next = new Set(prev)
      if (next.has(key)) {
        next.delete(key)
      } else {
        next.add(key)
      }
      return next
    })
  }

  if (isLoading) {
    return <SummarySkeleton />
  }

  const sortedData = sortData(data, sortConfig)

  return (
    <Card>
      <CardHeader>
        <CardTitle>チーム別サマリ</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead onClick={() => handleSort('departmentName')}>
                チーム名 <SortIcon />
              </TableHead>
              <TableHead onClick={() => handleSort('projectCount')}>
                案件数 <SortIcon />
              </TableHead>
              <TableHead onClick={() => handleSort('orderAmount')}>
                発注金額 <SortIcon />
              </TableHead>
              <TableHead onClick={() => handleSort('grossProfit')}>
                粗利 <SortIcon />
              </TableHead>
              <TableHead onClick={() => handleSort('grossProfitRate')}>
                粗利率 <SortIcon />
              </TableHead>
              <TableHead onClick={() => handleSort('compositionRate')}>
                構成比 <SortIcon />
              </TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedData.map(team => (
              <TeamSummaryRow
                key={team.departmentId || 'unassigned'}
                data={team}
                isExpanded={expandedRows.has(team.departmentId || 'unassigned')}
                onToggle={() => toggleRow(team.departmentId)}
              />
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
```

### 6.3 SWRフック

```typescript
// hooks/use-ledger-summary.ts
import useSWR from 'swr'

interface LedgerFilters {
  projectType?: string
  status?: string
  departmentId?: string
  startDate?: string
  endDate?: string
}

export function useLedgerSummary(filters: LedgerFilters) {
  const params = new URLSearchParams()

  Object.entries(filters).forEach(([key, value]) => {
    if (value) {
      params.append(key, value)
    }
  })

  const { data, error, isLoading, mutate } = useSWR(
    `/api/performance-ledger/summary?${params.toString()}`,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000, // 1分間はキャッシュを使用
    }
  )

  return {
    summary: data,
    isLoading,
    isError: error,
    refresh: mutate,
  }
}
```

## 7. 実装計画

### 7.1 実装フェーズ

| フェーズ | 作業内容 | 見積時間 |
|---------|---------|---------|
| Phase 1 | サマリAPI実装（`/api/performance-ledger/summary`） | 3時間 |
| Phase 2 | 全体サマリコンポーネント実装 | 2時間 |
| Phase 3 | チーム別サマリコンポーネント実装 | 3時間 |
| Phase 4 | 展開機能・ソート機能実装 | 2時間 |
| Phase 5 | レスポンシブ対応・スタイリング調整 | 2時間 |
| Phase 6 | テスト・デバッグ | 2時間 |
| **合計** | | **14時間** |

### 7.2 実装順序

1. **サマリAPI実装**
   - `/api/performance-ledger/summary` エンドポイントの作成
   - 集計ロジックの実装
   - フィルター連動の実装

2. **全体サマリの実装**
   - `OverallSummary` コンポーネントの作成
   - `useLedgerSummary` フックの作成
   - スタイリング

3. **チーム別サマリの実装**
   - `TeamSummaryTable` コンポーネントの作成
   - `TeamSummaryRow` コンポーネントの作成
   - 展開・折りたたみ機能

4. **ソート・インタラクション**
   - 列ソート機能
   - ホバー・クリック効果

5. **レスポンシブ対応**
   - モバイル用カード表示
   - ブレークポイント調整

6. **統合・テスト**
   - 実績台帳ページへの統合
   - E2Eテスト作成

## 8. テスト計画

### 8.1 単体テスト

**APIテスト**:
```typescript
describe('/api/performance-ledger/summary', () => {
  it('全体サマリを正しく計算する', async () => {
    const response = await fetch('/api/performance-ledger/summary')
    const data = await response.json()

    expect(data.overall.projectCount).toBeGreaterThanOrEqual(0)
    expect(data.overall.totalGrossProfit).toBe(
      data.overall.totalOrderAmount -
      data.overall.totalOutsourcingCost -
      data.overall.totalServerDomainCost -
      data.overall.totalLaborCost
    )
  })

  it('チーム別サマリを正しく集計する', async () => {
    const response = await fetch('/api/performance-ledger/summary')
    const data = await response.json()

    const totalFromTeams = data.byTeam.reduce((sum, team) =>
      sum + team.orderAmount, 0
    )

    expect(totalFromTeams).toBe(data.overall.totalOrderAmount)
  })

  it('フィルターが正しく適用される', async () => {
    const response = await fetch('/api/performance-ledger/summary?status=active')
    const data = await response.json()

    // ステータスが active の案件のみが集計されている
    expect(data.overall.projectCount).toBeGreaterThan(0)
  })
})
```

**コンポーネントテスト**:
```typescript
describe('OverallSummary', () => {
  it('データを正しく表示する', () => {
    const mockData = {
      projectCount: 45,
      totalOrderAmount: 50000000,
      totalGrossProfit: 24000000,
      averageGrossProfitRate: 48.0,
      // ...
    }

    render(<OverallSummary data={mockData} />)

    expect(screen.getByText('45件')).toBeInTheDocument()
    expect(screen.getByText('¥50,000,000')).toBeInTheDocument()
    expect(screen.getByText('48.0%')).toBeInTheDocument()
  })

  it('粗利率に応じた色分けが正しい', () => {
    const mockData = {
      // ...
      averageGrossProfitRate: 55.0,
    }

    render(<OverallSummary data={mockData} />)

    const profitRateElement = screen.getByText('55.0%')
    expect(profitRateElement).toHaveClass('bg-green-600')
  })
})
```

### 8.2 E2Eテスト

```typescript
describe('実績台帳サマリ', () => {
  beforeEach(() => {
    cy.login()
    cy.visit('/performance-ledger')
  })

  it('全体サマリが表示される', () => {
    cy.get('[data-testid="overall-summary"]').should('be.visible')
    cy.get('[data-testid="overall-summary"]')
      .contains('総発注金額')
      .should('be.visible')
  })

  it('チーム別サマリが表示される', () => {
    cy.get('[data-testid="team-summary-table"]').should('be.visible')
    cy.get('[data-testid="team-summary-row"]').should('have.length.greaterThan', 0)
  })

  it('チーム行の展開・折りたたみが動作する', () => {
    cy.get('[data-testid="team-summary-row"]').first().click()
    cy.get('[data-testid="team-detail"]').should('be.visible')

    cy.get('[data-testid="team-summary-row"]').first().click()
    cy.get('[data-testid="team-detail"]').should('not.exist')
  })

  it('フィルター変更時にサマリが更新される', () => {
    cy.get('[data-testid="overall-summary"]')
      .find('[data-testid="project-count"]')
      .invoke('text')
      .then(initialCount => {
        cy.get('select[name="status"]').select('completed')

        cy.get('[data-testid="overall-summary"]')
          .find('[data-testid="project-count"]')
          .invoke('text')
          .should('not.equal', initialCount)
      })
  })

  it('チーム列のソートが動作する', () => {
    cy.get('[data-testid="team-summary-table"]')
      .find('th')
      .contains('発注金額')
      .click()

    // 昇順ソート確認
    cy.get('[data-testid="team-summary-row"]')
      .first()
      .invoke('attr', 'data-order-amount')
      .then(firstAmount => {
        cy.get('[data-testid="team-summary-row"]')
          .last()
          .invoke('attr', 'data-order-amount')
          .should('be.gte', firstAmount)
      })
  })
})
```

## 9. パフォーマンス考慮事項

### 9.1 最適化手法

1. **データベースレベルの集計**
   - SQLの`GROUP BY`と`SUM`を使用
   - アプリケーション層での集計を最小化

2. **キャッシング**
   - SWRによるクライアント側キャッシュ（60秒）
   - APIレスポンスのHTTPキャッシュヘッダー設定

3. **遅延読み込み**
   - チーム別詳細は展開時に初めて表示
   - 初期レンダリング時のデータ量を削減

4. **仮想スクロール**（将来的な拡張）
   - チーム数が多い場合に仮想スクロールを導入

### 9.2 パフォーマンス目標

| 指標 | 目標値 |
|------|--------|
| サマリAPI応答時間 | < 500ms（100案件の場合） |
| 初期レンダリング時間 | < 2秒 |
| フィルター変更時の更新時間 | < 1秒 |

## 10. アクセシビリティ

### 10.1 対応事項

1. **キーボード操作**
   - チーム行の展開・折りたたみをEnterキーで操作可能
   - Tabキーでフォーカス移動

2. **スクリーンリーダー対応**
   - ARIA属性の適切な設定
   - セマンティックHTML（`<table>`, `<th>`, `<td>`）の使用

3. **色覚異常対応**
   - 粗利率の色分けに加え、アイコンや記号でも情報を表現
   - コントラスト比4.5:1以上を確保

```tsx
// アクセシビリティ対応例
<div role="region" aria-label="全体サマリ">
  <h2 id="overall-summary-heading">全体サマリ</h2>
  <div aria-describedby="overall-summary-heading">
    {/* サマリ内容 */}
  </div>
</div>

<button
  aria-expanded={isExpanded}
  aria-controls={`team-detail-${teamId}`}
  onClick={() => toggleRow(teamId)}
>
  {teamName}
</button>
```

## 11. 今後の拡張案

### 11.1 グラフ表示

チーム別サマリをグラフで可視化：

1. **円グラフ**
   - チーム別売上構成比
   - 色分けでチームを区別

2. **棒グラフ**
   - チーム別粗利比較
   - 横棒グラフで金額を表示

3. **折れ線グラフ**（期間フィルター使用時）
   - 月別売上推移
   - チーム別の推移を重ねて表示

### 11.2 エクスポート機能

1. **Excel出力**
   - サマリデータをExcel形式でダウンロード
   - グラフも含めて出力

2. **PDF出力**
   - サマリレポートをPDF形式で出力
   - 印刷・共有用

### 11.3 予算・目標比較

1. **目標売上との比較**
   - チームごとに月次目標を設定
   - 達成率を表示

2. **前年同期比較**
   - 前年同期のデータと比較
   - 成長率を表示

### 11.4 ドリルダウン

1. **チームクリックで案件一覧表示**
   - チーム行をクリックで該当チームの案件のみフィルター
   - 実績台帳テーブルも連動して更新

2. **案件種別別のサブグループ表示**
   - チーム内を種別（開発/SES/保守等）でさらに分類

## 12. まとめ

実績台帳サマリ機能は、事業全体とチーム別の収益性を可視化し、経営判断をサポートします。

**主要な価値**:
- 全体の売上・粗利を一目で把握
- チーム間のパフォーマンス比較
- フィルター連動による柔軟な分析
- 視覚的な色分けで問題案件を即座に識別

**技術的な特徴**:
- データベースレベルの集計による高速化
- SWRによるキャッシング
- レスポンシブ対応
- アクセシビリティ配慮

この機能により、実績台帳がより戦略的な経営ツールとして活用できるようになります。
