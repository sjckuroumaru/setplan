import useSWR from 'swr'
import { fetcher } from '@/lib/fetcher'

interface UsePerformanceLedgerParams {
  page: number
  limit: number
  projectType?: string
  status?: string
  departmentId?: string
  startDate?: string
  endDate?: string
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export interface PerformanceLedgerItem {
  projectId: string
  projectNumber: string
  projectName: string
  issueDate: string | null
  supplierName: string | null
  projectType: string
  editorName: string | null
  teamName: string | null
  status: string
  memo: string | null
  orderAmount: number
  deliveryDeadline: string | null
  deliveryDate: string | null
  invoiceableDate: string | null
  outsourcingCost: number
  serverDomainCost: number
  laborCost: number
  grossProfit: number
  grossProfitRate: number
}

interface PerformanceLedgerResponse {
  data: PerformanceLedgerItem[]
  pagination: {
    currentPage: number
    totalPages: number
    totalCount: number
    limit: number
  }
}

export function usePerformanceLedger(params: UsePerformanceLedgerParams) {
  const queryParams = new URLSearchParams({
    page: params.page.toString(),
    limit: params.limit.toString(),
  })

  if (params.projectType) queryParams.append('projectType', params.projectType)
  if (params.status) queryParams.append('status', params.status)
  if (params.departmentId) queryParams.append('departmentId', params.departmentId)
  if (params.startDate) queryParams.append('startDate', params.startDate)
  if (params.endDate) queryParams.append('endDate', params.endDate)
  if (params.sortBy) queryParams.append('sortBy', params.sortBy)
  if (params.sortOrder) queryParams.append('sortOrder', params.sortOrder)

  const { data, error, isLoading, mutate } = useSWR<PerformanceLedgerResponse>(
    `/api/performance-ledger?${queryParams}`,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 5000,
      keepPreviousData: true,
    }
  )

  return {
    data: data?.data || [],
    pagination: data?.pagination,
    isLoading,
    isError: error,
    mutate,
  }
}
