import useSWR from 'swr'
import { fetcher } from '@/lib/fetcher'

interface UseInvoicesParams {
  page: number
  limit: number
  status?: string
  search?: string
  enabled?: boolean
}

interface Invoice {
  id: string
  invoiceNumber: string
  issueDate: string
  dueDate: string
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

interface InvoicesResponse {
  invoices: Invoice[]
  currentPage: number
  totalPages: number
  total: number
}

export function useInvoices(params: UseInvoicesParams) {
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

  const { data, error, isLoading, mutate } = useSWR<InvoicesResponse>(
    enabled ? `/api/invoices?${queryParams}` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 5000,
      keepPreviousData: true,
    }
  )

  return {
    invoices: data?.invoices || [],
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
