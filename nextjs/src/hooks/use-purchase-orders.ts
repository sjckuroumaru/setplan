import useSWR from 'swr'
import { fetcher } from '@/lib/fetcher'

interface UsePurchaseOrdersParams {
  enabled?: boolean
}

interface PurchaseOrder {
  id: string
  orderNumber: string
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

interface PurchaseOrdersResponse {
  purchaseOrders: PurchaseOrder[]
}

export function usePurchaseOrders(params?: UsePurchaseOrdersParams) {
  const { enabled = true } = params || {}

  const { data, error, isLoading, mutate } = useSWR<PurchaseOrdersResponse>(
    enabled ? '/api/purchase-orders' : null,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 5000,
      keepPreviousData: true,
    }
  )

  return {
    purchaseOrders: data?.purchaseOrders || [],
    isLoading,
    isError: error,
    mutate,
  }
}
