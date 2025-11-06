// 見積書・請求書共通の型定義

export interface DocumentItem {
  id?: string
  name: string
  quantity: string
  unit?: string | null
  unitPrice: string
  taxType: "taxable" | "non-taxable" | "tax-included"
  taxRate?: number
  amount: string
  remarks?: string | null
  displayOrder?: number
}

export interface Customer {
  id: string
  name: string
  postalCode?: string | null
  address?: string | null
  building?: string | null
  representative?: string | null
  phone?: string | null
  fax?: string | null
}

export interface Company {
  id: string
  name: string
  postalCode?: string | null
  address?: string | null
  building?: string | null
  representative?: string | null
  phone?: string | null
  fax?: string | null
  sealImagePath?: string | null
  qualifiedInvoiceNumber?: string | null
  bankName?: string | null
  branchName?: string | null
  accountType?: string | null
  accountNumber?: string | null
  accountHolder?: string | null
}

export interface User {
  id: string
  lastName: string
  firstName: string
  sealImagePath?: string | null
}

export type TaxType = "inclusive" | "exclusive"
export type RoundingType = "floor" | "ceil" | "round"

export interface CalculationSettings {
  taxType: TaxType
  taxRate: number
  roundingType: RoundingType
}

export interface CalculationResult {
  subtotal: number
  taxAmount: number
  taxAmount8: number
  taxAmount10: number
  totalAmount: number
}

// ステータス定義
export const ESTIMATE_STATUS = {
  draft: { label: "下書き", variant: "secondary" as const },
  sent: { label: "送付済", variant: "default" as const },
  accepted: { label: "受注", variant: "success" as const },
  rejected: { label: "却下", variant: "destructive" as const },
  expired: { label: "失注", variant: "outline" as const },
} as const

export const INVOICE_STATUS = {
  draft: { label: "下書き", variant: "secondary" as const },
  sent: { label: "入金待ち", variant: "default" as const },
  paid: { label: "入金済", variant: "success" as const },
} as const

export type EstimateStatus = keyof typeof ESTIMATE_STATUS
export type InvoiceStatus = keyof typeof INVOICE_STATUS