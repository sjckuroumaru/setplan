import useSWR from 'swr'
import { fetcher } from '@/lib/fetcher'

interface UseOrderConfirmationsParams {
  enabled?: boolean
}

interface OrderConfirmation {
  id: string
  confirmationNumber: string
  subject: string
  supplierId: string
  supplier: {
    id: string
    name: string
  }
  issueDate: string
  deliveryDate: string | null
  totalAmount: number
  status: string
  user: {
    id: string
    lastName: string
    firstName: string
  }
}

interface OrderConfirmationsResponse {
  orderConfirmations: OrderConfirmation[]
}

export function useOrderConfirmations(params?: UseOrderConfirmationsParams) {
  const { enabled = true } = params || {}

  const { data, error, isLoading, mutate } = useSWR<OrderConfirmationsResponse>(
    enabled ? '/api/order-confirmations' : null,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 5000,
      keepPreviousData: true,
    }
  )

  return {
    orderConfirmations: data?.orderConfirmations || [],
    isLoading,
    isError: error,
    mutate,
  }
}
