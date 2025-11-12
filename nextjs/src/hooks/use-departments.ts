import useSWR from 'swr'
import { fetcher } from '@/lib/fetcher'

interface UseDepartmentsParams {
  page?: number
  limit?: number
  searchQuery?: string
}

interface Department {
  id: string
  name: string
  sharedNotes: string | null
  createdAt: Date
  updatedAt: Date
  _count?: {
    users: number
    projects: number
  }
}

interface DepartmentsResponse {
  departments: Department[]
  pagination?: {
    currentPage: number
    totalPages: number
    totalCount: number
    hasNextPage: boolean
    hasPreviousPage: boolean
  }
}

export function useDepartments(params?: UseDepartmentsParams) {
  const queryParams = new URLSearchParams()

  if (params?.page) queryParams.append('page', params.page.toString())
  if (params?.limit) queryParams.append('limit', params.limit.toString())
  if (params?.searchQuery) queryParams.append('search', params.searchQuery)

  const queryString = queryParams.toString()
  const url = queryString ? `/api/departments?${queryString}` : '/api/departments'

  const { data, error, isLoading, mutate } = useSWR<DepartmentsResponse>(
    url,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 10000, // マスタデータなので10秒
      keepPreviousData: true,
    }
  )

  return {
    departments: data?.departments || [],
    pagination: data?.pagination,
    isLoading,
    isError: error,
    mutate,
  }
}
