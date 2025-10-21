import useSWR from 'swr'
import { fetcher } from '@/lib/fetcher'

interface UseProjectsParams {
  page: number
  limit: number
  status?: string
  departmentId?: string
  customerId?: string
  searchQuery?: string
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
  const queryParams = new URLSearchParams({
    page: params.page.toString(),
    limit: params.limit.toString(),
  })

  if (params.status) queryParams.append('status', params.status)
  if (params.departmentId) queryParams.append('departmentId', params.departmentId)
  if (params.customerId) queryParams.append('customerId', params.customerId)
  if (params.searchQuery) queryParams.append('search', params.searchQuery)

  const { data, error, isLoading, mutate } = useSWR<ProjectsResponse>(
    `/api/projects?${queryParams}`,
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
