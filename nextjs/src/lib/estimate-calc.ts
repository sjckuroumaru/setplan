import { Decimal } from "@prisma/client/runtime/library"

export interface EstimateItem {
  quantity: number | string | Decimal
  unitPrice: number | string | Decimal
  taxType: string
}

export interface EstimateCalcResult {
  subtotal: Decimal
  taxAmount: Decimal
  totalAmount: Decimal
}

/**
 * 見積金額を計算する
 */
export function calculateEstimateAmount(
  items: EstimateItem[],
  taxRate: number,
  taxType: "inclusive" | "exclusive",
  roundingType: "floor" | "ceil" | "round"
): EstimateCalcResult {
  let subtotal = new Decimal(0)
  let taxableAmount = new Decimal(0)

  // 各明細の金額を計算
  for (const item of items) {
    const quantity = new Decimal(item.quantity.toString())
    const unitPrice = new Decimal(item.unitPrice.toString())
    const amount = quantity.mul(unitPrice)
    
    subtotal = subtotal.add(amount)

    // 課税対象金額を計算
    if (item.taxType === "taxable") {
      if (taxType === "inclusive") {
        // 税込の場合、金額から税額を逆算
        const taxIncludedAmount = amount
        const taxExcludedAmount = taxIncludedAmount.div(1 + taxRate / 100)
        taxableAmount = taxableAmount.add(taxExcludedAmount)
      } else {
        // 税別の場合、金額をそのまま課税対象とする
        taxableAmount = taxableAmount.add(amount)
      }
    } else if (item.taxType === "tax-included" && taxType === "exclusive") {
      // 明細が税込で全体が税別の場合、税額を逆算して小計から引く
      const taxIncludedAmount = amount
      const taxExcludedAmount = taxIncludedAmount.div(1 + taxRate / 100)
      const itemTax = taxIncludedAmount.sub(taxExcludedAmount)
      subtotal = subtotal.sub(itemTax)
    }
  }

  // 税額を計算
  let taxAmount = new Decimal(0)
  if (taxType === "inclusive") {
    // 税込の場合、小計から税額を逆算
    const totalExcludingTax = subtotal.div(1 + taxRate / 100)
    taxAmount = subtotal.sub(totalExcludingTax)
  } else {
    // 税別の場合、課税対象金額に税率を掛ける
    taxAmount = taxableAmount.mul(taxRate / 100)
  }

  // 端数処理
  const taxAmountNumber = taxAmount.toNumber()
  let roundedTaxAmount: number
  switch (roundingType) {
    case "floor":
      roundedTaxAmount = Math.floor(taxAmountNumber)
      break
    case "ceil":
      roundedTaxAmount = Math.ceil(taxAmountNumber)
      break
    case "round":
      roundedTaxAmount = Math.round(taxAmountNumber)
      break
    default:
      roundedTaxAmount = Math.floor(taxAmountNumber)
  }

  const finalTaxAmount = new Decimal(roundedTaxAmount)

  // 合計金額を計算
  let totalAmount: Decimal
  if (taxType === "inclusive") {
    // 税込の場合、小計がそのまま合計
    totalAmount = subtotal
  } else {
    // 税別の場合、小計に税額を加算
    totalAmount = subtotal.add(finalTaxAmount)
  }

  return {
    subtotal,
    taxAmount: finalTaxAmount,
    totalAmount,
  }
}