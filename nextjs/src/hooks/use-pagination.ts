import { useState, useEffect, useCallback } from "react"

export interface PaginationInfo {
  page: number
  limit: number
  total: number
  totalPages: number
}

interface UsePaginationOptions {
  defaultLimit?: number
  onPageChange?: (page: number) => void
}

interface UsePaginationReturn {
  currentPage: number
  pagination: PaginationInfo
  setPagination: React.Dispatch<React.SetStateAction<PaginationInfo>>
  goToPage: (page: number) => void
  goToNextPage: () => void
  goToPreviousPage: () => void
  resetToFirstPage: () => void
  hasPreviousPage: boolean
  hasNextPage: boolean
}

/**
 * ページネーション管理用のカスタムフック
 * @param options - ページネーションオプション
 * @returns ページネーション管理用の状態と関数
 */
export function usePagination(
  options: UsePaginationOptions = {}
): UsePaginationReturn {
  const { defaultLimit = 10, onPageChange } = options

  const [currentPage, setCurrentPage] = useState(1)
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: defaultLimit,
    total: 0,
    totalPages: 0,
  })

  // ページ変更時のコールバック
  useEffect(() => {
    if (onPageChange) {
      onPageChange(currentPage)
    }
  }, [currentPage, onPageChange])

  // ページ移動関数
  const goToPage = useCallback((page: number) => {
    if (page >= 1 && page <= pagination.totalPages) {
      setCurrentPage(page)
    }
  }, [pagination.totalPages])

  // 次のページへ
  const goToNextPage = useCallback(() => {
    if (currentPage < pagination.totalPages) {
      setCurrentPage(prev => prev + 1)
    }
  }, [currentPage, pagination.totalPages])

  // 前のページへ
  const goToPreviousPage = useCallback(() => {
    if (currentPage > 1) {
      setCurrentPage(prev => prev - 1)
    }
  }, [currentPage])

  // 最初のページに戻る
  const resetToFirstPage = useCallback(() => {
    setCurrentPage(1)
  }, [])

  // ページネーション状態
  const hasPreviousPage = currentPage > 1
  const hasNextPage = currentPage < pagination.totalPages

  return {
    currentPage,
    pagination,
    setPagination,
    goToPage,
    goToNextPage,
    goToPreviousPage,
    resetToFirstPage,
    hasPreviousPage,
    hasNextPage,
  }
}