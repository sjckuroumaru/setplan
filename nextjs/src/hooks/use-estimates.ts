import useSWR from 'swr'
import { fetcher } from '@/lib/fetcher'

interface UseEstimatesParams {
  page: number
  limit: number
  status?: string
  enabled?: boolean
}

interface Estimate {
  id: string
  estimateNumber: string
  subject: string
  issueDate: string
  validUntil: string
  totalAmount: string
  status: string
  customer: {
    id: string
    name: string
  }
  user: {
    id: string
    lastName: string
    firstName: string
  }
}

interface EstimatesResponse {
  estimates: Estimate[]
  currentPage: number
  totalPages: number
  total: number
}

export function useEstimates(params: UseEstimatesParams) {
  const { enabled = true, ...fetchParams } = params

  const queryParams = new URLSearchParams({
    page: fetchParams.page.toString(),
    limit: fetchParams.limit.toString(),
  })

  if (fetchParams.status && fetchParams.status !== 'all') {
    queryParams.append('status', fetchParams.status)
  }

  const { data, error, isLoading, mutate } = useSWR<EstimatesResponse>(
    enabled ? `/api/estimates?${queryParams}` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 5000,
      keepPreviousData: true,
    }
  )

  return {
    estimates: data?.estimates || [],
    pagination: {
      currentPage: data?.currentPage || 1,
      totalPages: data?.totalPages || 1,
      total: data?.total || 0,
    },
    isLoading,
    isError: error,
    mutate,
  }
}
