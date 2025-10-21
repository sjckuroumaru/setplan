import useSWR from 'swr'
import { fetcher } from '@/lib/fetcher'

interface UseUsersParams {
  page?: number
  limit?: number
  departmentId?: string
  searchQuery?: string
  status?: string
  basic?: boolean
}

interface User {
  id: string
  username: string
  email: string
  lastName: string
  firstName: string
  employeeNumber: string
  isAdmin: boolean
  status: string
  departmentId: string | null
  department: {
    id: string
    name: string
  } | null
  departmentRef?: {
    id: string
    name: string
  } | null
  createdAt: Date
  updatedAt: Date
}

interface UsersResponse {
  users: User[]
  pagination?: {
    currentPage: number
    totalPages: number
    totalCount: number
    hasNextPage: boolean
    hasPreviousPage: boolean
  }
}

export function useUsers(params?: UseUsersParams) {
  const queryParams = new URLSearchParams()

  if (params?.page) queryParams.append('page', params.page.toString())
  if (params?.limit) queryParams.append('limit', params.limit.toString())
  if (params?.departmentId) queryParams.append('department', params.departmentId)
  if (params?.searchQuery) queryParams.append('search', params.searchQuery)
  if (params?.status) queryParams.append('status', params.status)
  if (params?.basic) queryParams.append('basic', 'true')

  const queryString = queryParams.toString()
  const url = queryString ? `/api/users?${queryString}` : '/api/users'

  const { data, error, isLoading, mutate } = useSWR<UsersResponse>(
    url,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 10000, // マスタデータなので10秒
      keepPreviousData: true,
    }
  )

  return {
    users: data?.users || [],
    pagination: data?.pagination,
    isLoading,
    isError: error,
    mutate,
  }
}
