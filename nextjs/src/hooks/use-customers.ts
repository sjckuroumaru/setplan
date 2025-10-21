import useSWR from 'swr'
import { fetcher } from '@/lib/fetcher'

interface UseCustomersParams {
  page: number
  limit: number
  searchQuery?: string
}

interface Customer {
  id: string
  name: string
  nameKana: string | null
  representative: string | null
  email: string | null
  phone: string | null
  address: string | null
  notes: string | null
  status: "active" | "inactive"
  createdAt: Date
  updatedAt: Date
}

interface CustomersResponse {
  customers: Customer[]
  pagination: {
    currentPage: number
    totalPages: number
    totalCount: number
    hasNextPage: boolean
    hasPreviousPage: boolean
  }
}

export function useCustomers(params: UseCustomersParams) {
  const queryParams = new URLSearchParams({
    page: params.page.toString(),
    limit: params.limit.toString(),
  })

  if (params.searchQuery) queryParams.append('search', params.searchQuery)

  const { data, error, isLoading, mutate } = useSWR<CustomersResponse>(
    `/api/customers?${queryParams}`,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 10000, // マスタデータなので10秒
      keepPreviousData: true,
    }
  )

  return {
    customers: data?.customers || [],
    pagination: data?.pagination,
    isLoading,
    isError: error,
    mutate,
  }
}
