import useSWR from 'swr'
import { fetcher } from '@/lib/fetcher'

interface UseGanttParams {
  departmentId?: string
  projectId?: string
  assigneeId?: string
  statusFilter?: string
}

interface GanttTask {
  id: string
  name: string
  title?: string
  start: Date | string
  end: Date | string
  startDate?: Date | string
  endDate?: Date | string
  progress: number
  type?: string
  status: string
  priority?: string
  category?: string
  assigneeId: string | null
  projectId: string | null
  project: {
    id: string
    projectNumber: string
    projectName: string
  } | null
  assignee: {
    id: string
    name?: string
    lastName?: string
    firstName?: string
  } | null
}

interface GanttResponse {
  tasks: GanttTask[]
}

export function useGantt(params: UseGanttParams) {
  const queryParams = new URLSearchParams()

  if (params.departmentId) queryParams.append('departmentId', params.departmentId)
  if (params.projectId) queryParams.append('projectId', params.projectId)
  if (params.assigneeId) queryParams.append('assigneeId', params.assigneeId)
  if (params.statusFilter) queryParams.append('status', params.statusFilter)

  const queryString = queryParams.toString()
  const url = queryString ? `/api/gantt?${queryString}` : '/api/gantt'

  const { data, error, isLoading, mutate } = useSWR<GanttResponse>(
    url,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 5000,
    }
  )

  return {
    tasks: data?.tasks || [],
    isLoading,
    isError: error,
    mutate,
  }
}
