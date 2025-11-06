import { useState, useEffect, useCallback } from "react"
import { UseFormReturn } from "react-hook-form"

interface InvoiceItem {
  quantity: number
  unitPrice: number
  taxType: "taxable" | "non-taxable" | "tax-included"
  taxRate?: number
}

interface CalculatedAmounts {
  subtotal: number
  taxAmount: number
  taxAmount8: number
  taxAmount10: number
  totalAmount: number
}

/**
 * 請求書の金額計算カスタムフック
 *
 * 明細の金額計算、税額計算、端数処理を行います。
 * form.watchで監視し、関連フィールドが変更されたときのみ再計算します。
 */
export function useInvoiceCalculations(form: UseFormReturn<any>) {
  const [calculatedAmounts, setCalculatedAmounts] = useState<CalculatedAmounts>({
    subtotal: 0,
    taxAmount: 0,
    taxAmount8: 0,
    taxAmount10: 0,
    totalAmount: 0,
  })

  const calculateAmounts = useCallback(() => {
    const items = form.getValues("items") as InvoiceItem[]
    const taxType = form.getValues("taxType") as "inclusive" | "exclusive"
    const taxRate = form.getValues("taxRate") as number
    const roundingType = form.getValues("roundingType") as "floor" | "ceil" | "round"

    let subtotal = 0
    let taxAmount8Total = 0
    let taxAmount10Total = 0

    items.forEach(item => {
      const amount = item.quantity * item.unitPrice

      if (taxType === "exclusive") {
        subtotal += amount
        if (item.taxType === "taxable") {
          const itemTaxRate = item.taxRate || taxRate
          const tax = amount * (itemTaxRate / 100)
          if (itemTaxRate === 8) {
            taxAmount8Total += tax
          } else if (itemTaxRate === 10) {
            taxAmount10Total += tax
          }
        }
      } else {
        // 税込の場合
        if (item.taxType === "taxable") {
          const itemTaxRate = item.taxRate || taxRate
          const baseAmount = amount / (1 + itemTaxRate / 100)
          subtotal += baseAmount
          const tax = amount - baseAmount
          if (itemTaxRate === 8) {
            taxAmount8Total += tax
          } else if (itemTaxRate === 10) {
            taxAmount10Total += tax
          }
        } else {
          subtotal += amount
        }
      }
    })

    // 端数処理
    const round = (value: number) => {
      switch (roundingType) {
        case "floor":
          return Math.floor(value)
        case "ceil":
          return Math.ceil(value)
        case "round":
          return Math.round(value)
        default:
          return Math.floor(value)
      }
    }

    taxAmount8Total = round(taxAmount8Total)
    taxAmount10Total = round(taxAmount10Total)
    const taxAmount = taxAmount8Total + taxAmount10Total
    const totalAmount = round(subtotal + taxAmount)

    setCalculatedAmounts({
      subtotal: round(subtotal),
      taxAmount,
      taxAmount8: taxAmount8Total,
      taxAmount10: taxAmount10Total,
      totalAmount,
    })
  }, [form])

  // 明細変更時に金額を再計算
  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name?.startsWith("items") || name === "taxType" || name === "taxRate" || name === "roundingType") {
        calculateAmounts()
      }
    })
    return () => subscription.unsubscribe()
  }, [form, calculateAmounts])

  return { calculatedAmounts, calculateAmounts }
}
