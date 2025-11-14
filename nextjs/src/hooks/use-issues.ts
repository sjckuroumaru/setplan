import useSWR from 'swr'
import { fetcher } from '@/lib/fetcher'

interface UseIssuesParams {
  page: number
  limit: number
  status?: string
  priority?: string
  projectId?: string
  assigneeIds?: string[]
  departmentIds?: string[]
  searchQuery?: string
}

interface Issue {
  id: string
  issueNumber: string
  title: string
  description: string | null
  status: string
  priority: string
  assigneeId: string | null
  projectId: string | null
  startDate: Date | null
  dueDate: Date | null
  createdAt: Date
  updatedAt: Date
  commentsCount: number
  assignee: {
    id: string
    lastName: string
    firstName: string
  } | null
  project: {
    id: string
    projectNumber: string
    projectName: string
  } | null
}

interface IssuesResponse {
  issues: Issue[]
  pagination: {
    currentPage: number
    totalPages: number
    totalCount: number
    hasNextPage: boolean
    hasPreviousPage: boolean
  }
}

export function useIssues(params: UseIssuesParams) {
  const queryParams = new URLSearchParams({
    page: params.page.toString(),
    limit: params.limit.toString(),
  })

  if (params.status) queryParams.append('status', params.status)
  if (params.priority) queryParams.append('priority', params.priority)
  if (params.projectId) queryParams.append('projectId', params.projectId)

  if (params.assigneeIds && params.assigneeIds.length > 0) {
    params.assigneeIds.forEach(id => queryParams.append('assigneeId', id))
  }
  if (params.departmentIds && params.departmentIds.length > 0) {
    params.departmentIds.forEach(id => queryParams.append('departmentId', id))
  }

  if (params.searchQuery) queryParams.append('search', params.searchQuery)

  const { data, error, isLoading, mutate } = useSWR<IssuesResponse>(
    `/api/issues?${queryParams}`,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 5000,
      keepPreviousData: true,
    }
  )

  return {
    issues: data?.issues || [],
    pagination: data?.pagination,
    isLoading,
    isError: error,
    mutate,
  }
}
