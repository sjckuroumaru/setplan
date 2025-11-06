import useSWR from 'swr'
import { fetcher } from '@/lib/fetcher'

interface UseLedgerSummaryParams {
  projectType?: string
  statuses?: string[]
  departmentId?: string
  startDate?: string
  endDate?: string
}

export interface TeamSummary {
  departmentId: string | null
  departmentName: string
  projectCount: number
  orderAmount: number
  outsourcingCost: number
  serverDomainCost: number
  laborCost: number
  grossProfit: number
  grossProfitRate: number
  compositionRate: number
  averageOrderAmount: number
  averageGrossProfit: number
}

export interface OverallSummary {
  projectCount: number
  totalOrderAmount: number
  totalOutsourcingCost: number
  totalServerDomainCost: number
  totalLaborCost: number
  totalGrossProfit: number
  averageGrossProfitRate: number
}

interface LedgerSummaryResponse {
  overall: OverallSummary
  byTeam: TeamSummary[]
}

export function useLedgerSummary(params: UseLedgerSummaryParams) {
  const queryParams = new URLSearchParams()

  if (params.projectType) queryParams.append('projectType', params.projectType)
  if (params.statuses && params.statuses.length > 0) {
    params.statuses.forEach(status => queryParams.append('status', status))
  }
  if (params.departmentId) queryParams.append('departmentId', params.departmentId)
  if (params.startDate) queryParams.append('startDate', params.startDate)
  if (params.endDate) queryParams.append('endDate', params.endDate)

  const { data, error, isLoading, mutate } = useSWR<LedgerSummaryResponse>(
    `/api/performance-ledger/summary?${queryParams}`,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000, // 1分間はキャッシュを使用
      keepPreviousData: true,
    }
  )

  return {
    overall: data?.overall,
    byTeam: data?.byTeam || [],
    isLoading,
    isError: error,
    mutate,
  }
}
