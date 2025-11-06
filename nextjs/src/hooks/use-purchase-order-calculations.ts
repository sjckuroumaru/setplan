import { useState, useEffect, useCallback } from "react"
import { UseFormReturn } from "react-hook-form"

interface PurchaseOrderItem {
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
 * 発注書の金額計算カスタムフック
 *
 * 明細の金額計算、税額計算、端数処理を行います。
 * form.watchで監視し、関連フィールドが変更されたときのみ再計算します。
 */
export function usePurchaseOrderCalculations(form: UseFormReturn<any>) {
  const [calculatedAmounts, setCalculatedAmounts] = useState<CalculatedAmounts>({
    subtotal: 0,
    taxAmount: 0,
    taxAmount8: 0,
    taxAmount10: 0,
    totalAmount: 0,
  })

  const calculateAmounts = useCallback(() => {
    const items = form.getValues("items") as PurchaseOrderItem[]
    const taxType = form.getValues("taxType") as "inclusive" | "exclusive"
    const roundingType = form.getValues("roundingType") as "floor" | "ceil" | "round"

    let subtotal = 0
    let taxAmount8 = 0
    let taxAmount10 = 0

    items.forEach((item) => {
      const amount = Number(item.quantity) * Number(item.unitPrice)
      subtotal += amount

      if (item.taxType === "taxable") {
        const itemTaxRate = Number(item.taxRate) || 10
        const itemTaxAmount = taxType === "inclusive"
          ? amount - amount / (1 + itemTaxRate / 100)
          : amount * (itemTaxRate / 100)

        if (itemTaxRate === 8) {
          taxAmount8 += itemTaxAmount
        } else if (itemTaxRate === 10) {
          taxAmount10 += itemTaxAmount
        }
      }
    })

    // 端数処理
    const applyRounding = (value: number) => {
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

    taxAmount8 = applyRounding(taxAmount8)
    taxAmount10 = applyRounding(taxAmount10)
    const taxAmount = taxAmount8 + taxAmount10
    const totalAmount = taxType === "inclusive" ? subtotal : subtotal + taxAmount

    setCalculatedAmounts({
      subtotal,
      taxAmount,
      taxAmount8,
      taxAmount10,
      totalAmount,
    })

    return {
      subtotal,
      taxAmount,
      taxAmount8,
      taxAmount10,
      totalAmount,
    }
  }, [form])

  // 明細変更時に金額を再計算
  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name?.startsWith("items") || name === "taxType" || name === "taxRate" || name === "roundingType") {
        calculateAmounts()
      }
    })
    return () => subscription.unsubscribe()
  }, [calculateAmounts, form])

  return { calculatedAmounts, calculateAmounts }
}
