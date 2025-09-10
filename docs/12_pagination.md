# ページネーション機能

## 概要
予定実績管理と課題管理ページで共通化されたページネーション機能を実装しています。

## 構成

### 1. カスタムフック: `usePagination`
**ファイル**: `/src/hooks/use-pagination.ts`

ページネーション管理用の共通フックです。

```typescript
const {
  currentPage,           // 現在のページ番号
  pagination,            // ページネーション情報（page, limit, total, totalPages）
  setPagination,         // ページネーション情報を更新
  goToNextPage,         // 次のページへ移動
  goToPreviousPage,     // 前のページへ移動
  resetToFirstPage,     // 最初のページに戻る
  hasPreviousPage,      // 前のページが存在するか
  hasNextPage,          // 次のページが存在するか
} = usePagination({ defaultLimit: 10 })
```

### 2. UIコンポーネント: `PaginationControls`
**ファイル**: `/src/components/ui/pagination-controls.tsx`

ページネーションのUIを提供する共通コンポーネントです。

```tsx
<PaginationControls
  currentPage={currentPage}
  totalPages={pagination.totalPages}
  totalItems={pagination.total}
  onPreviousPage={goToPreviousPage}
  onNextPage={goToNextPage}
  hasPreviousPage={hasPreviousPage}
  hasNextPage={hasNextPage}
  loading={loading}
/>
```

### 3. 設定
**ファイル**: `/src/lib/config.ts`

環境変数からページネーション設定を読み込みます。

```typescript
export const config = {
  pagination: {
    defaultLimit: parseInt(process.env.DEFAULT_PAGINATION_LIMIT || "10"),
  },
}
```

## 使用方法

### ページでの実装例

```typescript
import { usePagination } from "@/hooks/use-pagination"
import { PaginationControls } from "@/components/ui/pagination-controls"

export default function MyPage() {
  const {
    currentPage,
    pagination,
    setPagination,
    goToNextPage,
    goToPreviousPage,
    resetToFirstPage,
    hasPreviousPage,
    hasNextPage,
  } = usePagination({ defaultLimit: 10 })

  // データ取得関数
  const fetchData = async (pageNumber: number) => {
    const params = new URLSearchParams({
      page: pageNumber.toString(),
      limit: pagination.limit.toString(),
    })
    
    const response = await fetch(`/api/endpoint?${params}`)
    const data = await response.json()
    
    // ページネーション情報を更新
    setPagination(data.pagination)
  }

  // フィルター変更時にページを1に戻す
  useEffect(() => {
    resetToFirstPage()
  }, [filters])

  // ページ変更時にデータを取得
  useEffect(() => {
    fetchData(currentPage)
  }, [currentPage])

  return (
    <>
      {/* データ表示部分 */}
      
      {/* ページネーションコントロール */}
      <PaginationControls
        currentPage={currentPage}
        totalPages={pagination.totalPages}
        totalItems={pagination.total}
        onPreviousPage={goToPreviousPage}
        onNextPage={goToNextPage}
        hasPreviousPage={hasPreviousPage}
        hasNextPage={hasNextPage}
        loading={loading}
      />
    </>
  )
}
```

## 環境変数設定

`.env.local`ファイルに以下を追加して、デフォルトの表示件数を設定できます：

```env
# Pagination
DEFAULT_PAGINATION_LIMIT="10"
```

## APIでの実装

APIルートでは設定値を使用してデフォルトのlimitを設定します：

```typescript
import { config } from "@/lib/config"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get("page") || "1")
  const limit = parseInt(searchParams.get("limit") || config.pagination.defaultLimit.toString())
  
  const skip = (page - 1) * limit
  
  // データ取得処理
  const [items, total] = await Promise.all([
    prisma.model.findMany({
      skip,
      take: limit,
      // その他の条件
    }),
    prisma.model.count({
      // カウント条件
    })
  ])
  
  return NextResponse.json({
    items,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    }
  })
}
```

## 現在の使用箇所

- `/schedules` - 予定実績管理ページ
- `/issues` - 課題管理ページ

## 今後の拡張

必要に応じて、以下の機能を追加できます：

- ページ番号の直接入力
- 表示件数の変更（10件、20件、50件など）
- ページジャンプ機能
- 最初/最後のページへのジャンプボタン