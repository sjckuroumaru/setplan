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

  if (fetchParams.userId) queryParams.append('userId', fetchParams.userId)
  if (fetchParams.departmentId) queryParams.append('departmentId', fetchParams.departmentId)
  if (fetchParams.startDate) queryParams.append('startDate', fetchParams.startDate)
  if (fetchParams.endDate) queryParams.append('endDate', fetchParams.endDate)
  if (fetchParams.searchQuery) queryParams.append('search', fetchParams.searchQuery)

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
