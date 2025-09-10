import { Button } from "@/components/ui/button"

interface PaginationControlsProps {
  currentPage: number
  totalPages: number
  totalItems: number
  onPreviousPage: () => void
  onNextPage: () => void
  hasPreviousPage: boolean
  hasNextPage: boolean
  loading?: boolean
}

export function PaginationControls({
  currentPage,
  totalPages,
  totalItems,
  onPreviousPage,
  onNextPage,
  hasPreviousPage,
  hasNextPage,
  loading = false,
}: PaginationControlsProps) {
  // ページネーションが不要な場合は表示しない
  if (totalPages <= 1) {
    return null
  }

  return (
    <div className="flex items-center justify-center gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={onPreviousPage}
        disabled={!hasPreviousPage || loading}
      >
        前へ
      </Button>
      <span className="text-sm text-muted-foreground">
        {currentPage} / {totalPages}ページ （{totalItems}件）
      </span>
      <Button
        variant="outline"
        size="sm"
        onClick={onNextPage}
        disabled={!hasNextPage || loading}
      >
        次へ
      </Button>
    </div>
  )
}