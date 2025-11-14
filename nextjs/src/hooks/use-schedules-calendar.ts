import useSWR from 'swr'
import { fetcher } from '@/lib/fetcher'

interface UseSchedulesCalendarParams {
  startDate: string
  endDate: string
  userId?: string
  departmentIds?: string[]
  enabled?: boolean
}

interface CalendarSchedule {
  id: string
  date: string
  checkInTime: string | null
  checkOutTime: string | null
  reflection: string | null
  user: {
    id: string
    name: string
    employeeNumber: string
  }
  plans: Array<{
    id: string
    content: string
    details: string | null
    project: {
      id: string
      name: string
      number: string
    } | null
  }>
  actuals: Array<{
    id: string
    content: string
    hours: number
    details: string | null
    project: {
      id: string
      name: string
      number: string
    } | null
  }>
  totalHours: number
}

interface SchedulesCalendarResponse {
  schedules: CalendarSchedule[]
  dateRange: {
    startDate: string
    endDate: string
  }
  totalCount: number
}

export function useSchedulesCalendar(params: UseSchedulesCalendarParams) {
  const queryParams = new URLSearchParams({
    startDate: params.startDate,
    endDate: params.endDate,
  })

  if (params.userId && params.userId !== "all") {
    queryParams.append('userId', params.userId)
  }

  if (params.departmentIds && params.departmentIds.length > 0) {
    queryParams.append('departmentIds', params.departmentIds.join(','))
  }

  const { data, error, isLoading, mutate } = useSWR<SchedulesCalendarResponse>(
    params.enabled !== false ? `/api/schedules/calendar?${queryParams}` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 5000,
    }
  )

  return {
    schedules: data?.schedules || [],
    dateRange: data?.dateRange,
    totalCount: data?.totalCount || 0,
    isLoading,
    isError: error,
    mutate,
  }
}
