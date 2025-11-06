import useSWR from 'swr'
import { fetcher } from '@/lib/fetcher'

interface UseDeliveryNotesParams {
  page: number
  limit: number
  status?: string
  search?: string
  enabled?: boolean
}

interface DeliveryNote {
  id: string
  deliveryNoteNumber: string
  deliveryDate: string
  subject: string
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

interface DeliveryNotesResponse {
  deliveryNotes: DeliveryNote[]
  currentPage: number
  totalPages: number
  total: number
}

export function useDeliveryNotes(params: UseDeliveryNotesParams) {
  const { enabled = true, ...fetchParams } = params

  const queryParams = new URLSearchParams({
    page: fetchParams.page.toString(),
    limit: fetchParams.limit.toString(),
  })

  if (fetchParams.status && fetchParams.status !== 'all') {
    queryParams.append('status', fetchParams.status)
  }

  if (fetchParams.search) {
    queryParams.append('search', fetchParams.search)
  }

  const { data, error, isLoading, mutate } = useSWR<DeliveryNotesResponse>(
    enabled ? `/api/delivery-notes?${queryParams}` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 5000,
      keepPreviousData: true,
    }
  )

  return {
    deliveryNotes: data?.deliveryNotes || [],
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
