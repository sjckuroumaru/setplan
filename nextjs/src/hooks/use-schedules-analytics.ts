import useSWR from 'swr'
import { fetcher } from '@/lib/fetcher'

interface UseSchedulesAnalyticsParams {
  startDate: string
  endDate: string
  userId?: string
  projectId?: string
  departmentId?: string
}

interface UserProjectData {
  name: string
  total: number
  [projectName: string]: number | string
}

interface Distribution {
  name: string
  value: number
  percentage: number
  [key: string]: string | number
}

interface Statistics {
  totalHours: number
  averageHours: number
  targetHours: number
  achievementRate: number
  userCount: number
}

interface TableData {
  yearMonth: string
  userName: string
  projectName: string
  totalHours: number
}

interface SchedulesAnalyticsResponse {
  userProjectData: UserProjectData[]
  projectDistribution: Distribution[]
  departmentDistribution: Distribution[]
  tableData: TableData[]
  statistics: Statistics
  dateRange: {
    startDate: string
    endDate: string
  }
}

export function useSchedulesAnalytics(params: UseSchedulesAnalyticsParams) {
  const queryParams = new URLSearchParams({
    startDate: params.startDate,
    endDate: params.endDate,
  })

  if (params.userId && params.userId !== "all") {
    queryParams.append('userId', params.userId)
  }
  if (params.projectId && params.projectId !== "all") {
    queryParams.append('projectId', params.projectId)
  }
  if (params.departmentId && params.departmentId !== "all") {
    queryParams.append('departmentId', params.departmentId)
  }

  const { data, error, isLoading, mutate } = useSWR<SchedulesAnalyticsResponse>(
    `/api/schedules/analytics?${queryParams}`,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 5000,
    }
  )

  return {
    userProjectData: data?.userProjectData || [],
    projectDistribution: data?.projectDistribution || [],
    departmentDistribution: data?.departmentDistribution || [],
    tableData: data?.tableData || [],
    statistics: data?.statistics || {
      totalHours: 0,
      averageHours: 0,
      targetHours: 0,
      achievementRate: 0,
      userCount: 0,
    },
    dateRange: data?.dateRange,
    isLoading,
    isError: error,
    mutate,
  }
}
