"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PurchaseOrderForm } from "@/components/documents/purchase-order-form"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"

export default function EditPurchaseOrderPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const router = useRouter()
  const [purchaseOrder, setPurchaseOrder] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [resolvedParams, setResolvedParams] = useState<{ id: string } | null>(null)

  useEffect(() => {
    params.then(setResolvedParams)
  }, [params])

  useEffect(() => {
    if (resolvedParams) {
      fetchPurchaseOrder()
    }
  }, [resolvedParams])

  const fetchPurchaseOrder = async () => {
    if (!resolvedParams) return

    try {
      const response = await fetch(`/api/purchase-orders/${resolvedParams.id}`)
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
        deliveryLocation: data.deliveryLocation || "",
        paymentTerms: data.paymentTerms || "",
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

      setPurchaseOrder(formData)
    } catch {
      toast.error("発注書の取得に失敗しました")
      router.push("/purchase-orders")
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <Loader2 className="animate-spin h-8 w-8" />
      </div>
    )
  }

  if (!purchaseOrder) {
    return null
  }

  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle>発注書編集</CardTitle>
        </CardHeader>
        <CardContent>
          <PurchaseOrderForm initialData={purchaseOrder} isEditMode />
        </CardContent>
      </Card>
    </div>
  )
}