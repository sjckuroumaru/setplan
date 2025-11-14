import useSWR from 'swr'
import { fetcher } from '@/lib/fetcher'

interface UseSchedulesParams {
  page: number
  limit: number
  userId?: string
  departmentId?: string
  userIds?: string[]
  departmentIds?: string[]
  startDate?: string
  endDate?: string
  searchQuery?: string
  sortBy?: string
  sortOrder?: "asc" | "desc"
  enabled?: boolean
}

interface Schedule {
  id: string
  userId: string
  scheduleDate: Date
  checkInTime: string | null
  checkOutTime: string | null
  workLocation: string | null
  reflection: string | null
  user: {
    id: string
    lastName: string
    firstName: string
    employeeNumber: string
  }
  plans: Array<{
    id: string
    projectId: string | null
    content: string
    details: string | null
    displayOrder: number
    project: {
      id: string
      projectNumber: string
      projectName: string
    } | null
  }>
  actuals: Array<{
    id: string
    projectId: string | null
    content: string
    hours: number
    details: string | null
    displayOrder: number
    project: {
      id: string
      projectNumber: string
      projectName: string
    } | null
  }>
}

interface SchedulesResponse {
  schedules: Schedule[]
  pagination: {
    currentPage: number
    totalPages: number
    totalCount: number
    hasNextPage: boolean
    hasPreviousPage: boolean
  }
}

export function useSchedules(params: UseSchedulesParams) {
  const { enabled = true, ...fetchParams } = params

  const queryParams = new URLSearchParams({
    page: fetchParams.page.toString(),
    limit: fetchParams.limit.toString(),
  })

  // 後方互換性のため単一値もサポート
  if (fetchParams.userId) queryParams.append('userId', fetchParams.userId)
  if (fetchParams.departmentId) queryParams.append('departmentId', fetchParams.departmentId)

  // 複数選択対応
  if (fetchParams.userIds && fetchParams.userIds.length > 0) {
    fetchParams.userIds.forEach(id => queryParams.append('userId', id))
  }
  if (fetchParams.departmentIds && fetchParams.departmentIds.length > 0) {
    fetchParams.departmentIds.forEach(id => queryParams.append('departmentId', id))
  }

  if (fetchParams.startDate) queryParams.append('startDate', fetchParams.startDate)
  if (fetchParams.endDate) queryParams.append('endDate', fetchParams.endDate)
  if (fetchParams.searchQuery) queryParams.append('search', fetchParams.searchQuery)
  if (fetchParams.sortBy) queryParams.append('sortBy', fetchParams.sortBy)
  if (fetchParams.sortOrder) queryParams.append('sortOrder', fetchParams.sortOrder)

  const { data, error, isLoading, mutate } = useSWR<SchedulesResponse>(
    enabled ? `/api/schedules?${queryParams}` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 5000,
      keepPreviousData: true,
    }
  )

  return {
    schedules: data?.schedules || [],
    pagination: data?.pagination,
    isLoading,
    isError: error,
    mutate,
  }
}
