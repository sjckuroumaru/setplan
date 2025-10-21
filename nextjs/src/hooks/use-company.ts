import useSWR from 'swr'
import { fetcher } from '@/lib/fetcher'

interface Company {
  id: string
  name: string
  postalCode: string | null
  address: string | null
  building: string | null
  representative: string | null
  phone: string | null
  fax: string | null
  remarks: string | null
  qualifiedInvoiceNumber: string | null
  bankName: string | null
  branchName: string | null
  accountType: string | null
  accountNumber: string | null
  accountHolder: string | null
  sealImagePath: string | null
  createdAt: string
  updatedAt: string
}

interface CompanyResponse {
  company: Company | null
}

export function useCompany() {
  const { data, error, isLoading, mutate } = useSWR<CompanyResponse>(
    '/api/company',
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 10000, // マスタデータなので10秒
    }
  )

  return {
    company: data?.company || null,
    isLoading,
    isError: error,
    mutate,
  }
}
