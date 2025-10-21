import { useState, useEffect, useCallback } from "react"
import { UseFormReturn } from "react-hook-form"

interface EstimateItem {
  quantity: number
  unitPrice: number
  taxType: "taxable" | "non-taxable" | "tax-included"
}

interface CalculatedAmounts {
  subtotal: number
  taxAmount: number
  totalAmount: number
}

/**
 * 見積書の金額計算カスタムフック
 *
 * 明細の金額計算、税額計算、端数処理を行います。
 * form.watchで監視し、関連フィールドが変更されたときのみ再計算します。
 */
export function useEstimateCalculations(form: UseFormReturn<any>) {
  const [calculatedAmounts, setCalculatedAmounts] = useState<CalculatedAmounts>({
    subtotal: 0,
    taxAmount: 0,
    totalAmount: 0,
  })

  const calculateAmounts = useCallback(() => {
    const items = form.getValues("items") as EstimateItem[]
    const taxType = form.getValues("taxType") as "inclusive" | "exclusive"
    const taxRate = form.getValues("taxRate") as number
    const roundingType = form.getValues("roundingType") as "floor" | "ceil" | "round"

    let subtotal = 0
    let taxableAmount = 0

    items.forEach((item) => {
      const amount = item.quantity * item.unitPrice
      subtotal += amount

      if (item.taxType === "taxable") {
        if (taxType === "inclusive") {
          // 税込の場合
          taxableAmount += amount / (1 + taxRate / 100)
        } else {
          // 税別の場合
          taxableAmount += amount
        }
      }
    })

    let taxAmount = 0
    if (taxType === "inclusive") {
      // 税込の場合、小計から税額を逆算
      taxAmount = subtotal - subtotal / (1 + taxRate / 100)
    } else {
      // 税別の場合
      taxAmount = taxableAmount * (taxRate / 100)
    }

    // 端数処理
    switch (roundingType) {
      case "floor":
        taxAmount = Math.floor(taxAmount)
        break
      case "ceil":
        taxAmount = Math.ceil(taxAmount)
        break
      case "round":
        taxAmount = Math.round(taxAmount)
        break
    }

    const totalAmount = taxType === "inclusive" ? subtotal : subtotal + taxAmount

    setCalculatedAmounts({
      subtotal,
      taxAmount,
      totalAmount,
    })
  }, [])

  // 明細変更時に金額を再計算
  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name?.startsWith("items") || name === "taxType" || name === "taxRate" || name === "roundingType") {
        calculateAmounts()
      }
    })
    return () => subscription.unsubscribe()
  }, [calculateAmounts])

  return { calculatedAmounts, calculateAmounts }
}
