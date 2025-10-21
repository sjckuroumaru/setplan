import { z } from "zod"

// 共通の明細項目スキーマ
export const DocumentItemSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "項目名は必須です"),
  quantity: z.coerce.number().min(0, "数量は0以上である必要があります"),
  unit: z.string().optional(),
  unitPrice: z.coerce.number().min(0, "単価は0以上である必要があります"),
  taxType: z.enum(["taxable", "non-taxable", "tax-included"]),
  taxRate: z.number().optional(),
  amount: z.union([z.string(), z.number()]).transform(val => String(val)).optional(),
  remarks: z.string().optional(),
  displayOrder: z.number().optional(),
})

// 見積書作成・更新用スキーマ
export const EstimateFormSchema = z.object({
  customerId: z.string().min(1, "顧客は必須です"),
  honorific: z.string().optional(),
  subject: z.string().min(1, "件名は必須です"),
  issueDate: z.string(),
  validUntil: z.string(),
  taxType: z.enum(["inclusive", "exclusive"]),
  taxRate: z.number(),
  roundingType: z.enum(["floor", "ceil", "round"]),
  remarks: z.string().optional(),
  items: z.array(DocumentItemSchema),
})

// 請求書作成・更新用スキーマ
export const InvoiceFormSchema = z.object({
  customerId: z.string().min(1, "顧客は必須です"),
  honorific: z.string().optional(),
  subject: z.string().min(1, "件名は必須です"),
  issueDate: z.string(),
  dueDate: z.string(),
  taxType: z.enum(["inclusive", "exclusive"]),
  taxRate: z.number(),
  roundingType: z.enum(["floor", "ceil", "round"]),
  remarks: z.string().optional(),
  items: z.array(DocumentItemSchema),
})

// 顧客スキーマ
export const CustomerSchema = z.object({
  name: z.string().min(1, "会社名は必須です"),
  postalCode: z.string().optional(),
  address: z.string().optional(),
  building: z.string().optional(),
  representative: z.string().optional(),
  phone: z.string().optional(),
  fax: z.string().optional(),
  remarks: z.string().optional(),
  status: z.enum(["active", "inactive"]).optional(),
})

// 発注書作成・更新用スキーマ
export const PurchaseOrderFormSchema = z.object({
  supplierId: z.string().min(1, "発注先は必須です"),
  honorific: z.string().optional(),
  subject: z.string().min(1, "件名は必須です"),
  issueDate: z.string(),
  deliveryDate: z.string().optional(),
  completionPeriod: z.string().optional(),
  deliveryLocation: z.string().optional(),
  paymentTerms: z.string().optional(),
  taxType: z.enum(["inclusive", "exclusive"]),
  taxRate: z.number(),
  roundingType: z.enum(["floor", "ceil", "round"]),
  remarks: z.string().optional(),
  items: z.array(DocumentItemSchema),
})

// 自社情報スキーマ
export const CompanySchema = z.object({
  name: z.string().min(1, "会社名は必須です"),
  postalCode: z.string().optional(),
  address: z.string().optional(),
  building: z.string().optional(),
  representative: z.string().optional(),
  phone: z.string().optional(),
  fax: z.string().optional(),
  remarks: z.string().optional(),
  qualifiedInvoiceNumber: z.string().optional(),
  bankName: z.string().optional(),
  branchName: z.string().optional(),
  accountType: z.string().optional(),
  accountNumber: z.string().optional(),
  accountHolder: z.string().optional(),
})