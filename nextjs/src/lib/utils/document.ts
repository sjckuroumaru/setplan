import { DocumentItem, CalculationSettings, CalculationResult } from "@/types/document"

/**
 * 金額をフォーマット
 */
export function formatCurrency(amount: string | number): string {
  const num = typeof amount === "string" ? parseFloat(amount) : amount
  return new Intl.NumberFormat("ja-JP", {
    style: "currency",
    currency: "JPY",
  }).format(num)
}

/**
 * 日付をフォーマット
 */
export function formatDate(dateString: string | Date): string {
  const date = typeof dateString === "string" ? new Date(dateString) : dateString
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`
}

/**
 * 日付を短い形式でフォーマット
 */
export function formatDateShort(dateString: string | Date): string {
  const date = typeof dateString === "string" ? new Date(dateString) : dateString
  return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`
}

/**
 * 端数処理
 */
export function roundAmount(amount: number, roundingType: CalculationSettings["roundingType"]): number {
  switch (roundingType) {
    case "floor":
      return Math.floor(amount)
    case "ceil":
      return Math.ceil(amount)
    case "round":
      return Math.round(amount)
    default:
      return Math.floor(amount)
  }
}

/**
 * 明細から金額を計算
 */
export function calculateAmounts(
  items: DocumentItem[],
  settings: CalculationSettings
): CalculationResult {
  let subtotal = 0
  let taxAmount8 = 0
  let taxAmount10 = 0

  items.forEach(item => {
    const amount = parseFloat(item.amount)
    subtotal += amount

    if (item.taxType === "taxable") {
      const rate = item.taxRate || settings.taxRate
      if (rate === 8) {
        taxAmount8 += amount * 0.08
      } else if (rate === 10) {
        taxAmount10 += amount * 0.1
      }
    }
  })

  // 端数処理
  taxAmount8 = roundAmount(taxAmount8, settings.roundingType)
  taxAmount10 = roundAmount(taxAmount10, settings.roundingType)
  const totalTaxAmount = taxAmount8 + taxAmount10
  const totalAmount = subtotal + totalTaxAmount

  return {
    subtotal,
    taxAmount: totalTaxAmount,
    taxAmount8,
    taxAmount10,
    totalAmount,
  }
}

/**
 * 見積書番号・請求書番号を生成
 */
export function generateDocumentNumber(
  prefix: string,
  count: number,
  date?: Date
): string {
  const targetDate = date || new Date()
  const yearMonth = `${targetDate.getFullYear()}${String(targetDate.getMonth() + 1).padStart(2, "0")}`
  const sequenceNumber = String(count + 1).padStart(4, "0")
  return `${prefix}${yearMonth}-${sequenceNumber}`
}

/**
 * 翌月末日を取得
 */
export function getNextMonthEndDate(date?: Date): Date {
  const targetDate = date || new Date()
  const nextMonth = new Date(targetDate.getFullYear(), targetDate.getMonth() + 2, 0)
  return nextMonth
}

/**
 * 期限超過かどうかを判定
 */
export function isOverdue(dueDate: string | Date): boolean {
  const due = typeof dueDate === "string" ? new Date(dueDate) : dueDate
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  due.setHours(0, 0, 0, 0)
  return due < now
}

/**
 * 小計から単価を逆算
 */
export function calculateUnitPrice(amount: number, quantity: number): number {
  if (quantity === 0) return 0
  return amount / quantity
}

/**
 * 数量と単価から金額を計算
 */
export function calculateItemAmount(quantity: number, unitPrice: number): number {
  return quantity * unitPrice
}