"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { OrderConfirmationForm } from "@/components/documents/order-confirmation-form"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"

export default function EditOrderConfirmationPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const router = useRouter()
  const [orderConfirmation, setOrderConfirmation] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [resolvedParams, setResolvedParams] = useState<{ id: string } | null>(null)

  useEffect(() => {
    params.then(setResolvedParams)
  }, [params])

  const fetchOrderConfirmation = useCallback(async () => {
    if (!resolvedParams) return

    try {
      const response = await fetch(`/api/order-confirmations/${resolvedParams.id}`)
      if (!response.ok) throw new Error()
      const data = await response.json()

      // フォーム用にデータを整形
      const formData = {
        id: data.id,
        supplierId: data.supplierId,
        honorific: data.honorific || "御中",
        subject: data.subject,
        issueDate: data.issueDate.split("T")[0],
        deliveryDate: data.deliveryDate ? data.deliveryDate.split("T")[0] : "",
        completionPeriod: data.completionPeriod || "",
        paymentTerms: data.paymentTerms || "",
        purchaseOrderId: data.purchaseOrderId || "",
        taxType: data.taxType,
        taxRate: data.taxRate,
        roundingType: data.roundingType,
        remarks: data.remarks || "",
        items: data.items.map((item: any) => ({
          id: item.id,
          name: item.name,
          quantity: Number(item.quantity),
          unit: item.unit || "",
          unitPrice: Number(item.unitPrice),
          taxType: item.taxType,
          taxRate: item.taxRate,
          amount: Number(item.amount),
          remarks: item.remarks || "",
          displayOrder: item.displayOrder,
        })),
      }

      setOrderConfirmation(formData)
    } catch {
      toast.error("発注請書の取得に失敗しました")
      router.push("/order-confirmations")
    } finally {
      setLoading(false)
    }
  }, [resolvedParams, router])

  useEffect(() => {
    if (resolvedParams) {
      fetchOrderConfirmation()
    }
  }, [resolvedParams, fetchOrderConfirmation])

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <Loader2 className="animate-spin h-8 w-8" />
      </div>
    )
  }

  if (!orderConfirmation) {
    return null
  }

  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle>発注請書編集</CardTitle>
        </CardHeader>
        <CardContent>
          <OrderConfirmationForm initialData={orderConfirmation} isEditMode />
        </CardContent>
      </Card>
    </div>
  )
}