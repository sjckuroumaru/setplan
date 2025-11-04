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
  scheduleDate: Date
  checkInTime: string | null
  checkOutTime: string | null
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
