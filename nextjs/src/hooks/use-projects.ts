import useSWR from 'swr'
import { fetcher } from '@/lib/fetcher'

interface UseProjectsParams {
  page: number
  limit: number
  status?: string
  departmentId?: string
  customerId?: string
  searchQuery?: string
  enabled?: boolean
}

interface Project {
  id: string
  projectNumber: string
  projectName: string
  description: string | null
  status: string
  departmentId: string | null
  department: {
    id: string
    name: string
  } | null
  purchaseOrderId: string | null
  purchaseOrder?: {
    id: string
    orderNumber: string
    subject: string
  } | null
  plannedStartDate: string | null
  plannedEndDate: string | null
  actualStartDate: string | null
  actualEndDate: string | null
  createdAt: string
  updatedAt: string
}

interface ProjectsResponse {
  projects: Project[]
  pagination: {
    currentPage: number
    totalPages: number
    totalCount: number
    hasNextPage: boolean
    hasPreviousPage: boolean
  }
}

export function useProjects(params: UseProjectsParams) {
  const { enabled = true, ...fetchParams } = params

  const queryParams = new URLSearchParams({
    page: fetchParams.page.toString(),
    limit: fetchParams.limit.toString(),
  })

  if (fetchParams.status) queryParams.append('status', fetchParams.status)
  if (fetchParams.departmentId) queryParams.append('departmentId', fetchParams.departmentId)
  if (fetchParams.customerId) queryParams.append('customerId', fetchParams.customerId)
  if (fetchParams.searchQuery) queryParams.append('search', fetchParams.searchQuery)

  const { data, error, isLoading, mutate } = useSWR<ProjectsResponse>(
    enabled ? `/api/projects?${queryParams}` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 5000,
      keepPreviousData: true,
    }
  )

  return {
    projects: data?.projects || [],
    pagination: data?.pagination,
    isLoading,
    isError: error,
    mutate,
  }
}
