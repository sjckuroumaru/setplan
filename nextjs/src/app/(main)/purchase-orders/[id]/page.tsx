"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Loader2, ArrowLeft, Pencil, Download, Copy, Trash } from "lucide-react"
import { toast } from "sonner"
import { useSession } from "next-auth/react"
import { format } from "date-fns"
import { ja } from "date-fns/locale"

type PurchaseOrderDetail = {
  id: string
  orderNumber: string
  subject: string
  supplierId: string
  supplier: {
    id: string
    name: string
    postalCode?: string
    address?: string
    building?: string
    phone?: string
    fax?: string
  }
  honorific: string
  issueDate: string
  deliveryDate?: string
  completionPeriod?: string
  deliveryLocation?: string
  paymentTerms?: string
  taxType: string
  taxRate: number
  roundingType: string
  subtotal: number
  taxAmount: number
  taxAmount8: number
  taxAmount10: number
  totalAmount: number
  remarks?: string
  status: string
  user: {
    id: string
    lastName: string
    firstName: string
  }
  items: Array<{
    id: string
    name: string
    quantity: number
    unit?: string
    unitPrice: number
    taxType: string
    taxRate: number
    amount: number
    remarks?: string
    displayOrder: number
  }>
  createdAt: string
  updatedAt: string
}

const statusColors: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  draft: "secondary",
  sent: "default",
  approved: "default",
  rejected: "destructive",
  closed: "outline",
}

const statusLabels: Record<string, string> = {
  draft: "下書き",
  sent: "送付済",
  approved: "承認済",
  rejected: "却下",
  closed: "完了",
}

export default function PurchaseOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const router = useRouter()
  const { data: session } = useSession()
  const [purchaseOrder, setPurchaseOrder] = useState<PurchaseOrderDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [resolvedParams, setResolvedParams] = useState<{ id: string } | null>(null)
  const [changingStatus, setChangingStatus] = useState(false)

  useEffect(() => {
    params.then(setResolvedParams)
  }, [params])

  const fetchPurchaseOrder = useCallback(async () => {
    if (!resolvedParams) return

    try {
      const response = await fetch(`/api/purchase-orders/${resolvedParams.id}`)
      if (!response.ok) throw new Error()
      const data = await response.json()
      setPurchaseOrder(data)
    } catch {
      toast.error("発注書の取得に失敗しました")
      router.push("/purchase-orders")
    } finally {
      setLoading(false)
    }
  }, [resolvedParams, router])

  useEffect(() => {
    if (resolvedParams) {
      fetchPurchaseOrder()
    }
  }, [resolvedParams, fetchPurchaseOrder])

  const handleDownloadPDF = async () => {
    if (!resolvedParams || !purchaseOrder) return

    const { downloadPDF } = await import("@/lib/pdf-utils")
    await downloadPDF(
      `/api/purchase-orders/${resolvedParams.id}/pdf`,
      `${purchaseOrder.orderNumber}.pdf`
    )
  }

  const handleDuplicate = async () => {
    if (!resolvedParams) return

    try {
      const response = await fetch(`/api/purchase-orders/${resolvedParams.id}/duplicate`, {
        method: "POST",
      })
      if (!response.ok) throw new Error()

      const duplicated = await response.json()
      router.push(`/purchase-orders/${duplicated.id}/edit`)

      toast.success("発注書を複製しました")
    } catch {
      toast.error("発注書の複製に失敗しました")
    }
  }

  const handleDelete = async () => {
    if (!resolvedParams) return
    if (!confirm("この発注書を削除してもよろしいですか？")) return

    try {
      const response = await fetch(`/api/purchase-orders/${resolvedParams.id}`, {
        method: "DELETE",
      })
      if (!response.ok) throw new Error()

      router.push("/purchase-orders")
      toast.success("発注書を削除しました")
    } catch {
      toast.error("発注書の削除に失敗しました")
    }
  }

  const canEdit = () => {
    if (!session?.user || !purchaseOrder) return false
    return session.user.isAdmin || purchaseOrder.user.id === session.user.id
  }

  const canDelete = () => {
    if (!session?.user || !purchaseOrder) return false
    return (session.user.isAdmin || purchaseOrder.user.id === session.user.id) && purchaseOrder.status === "draft"
  }

  const canChangeStatus = () => {
    if (!session?.user || !purchaseOrder) return false
    return session.user.isAdmin || purchaseOrder.user.id === session.user.id
  }

  const handleStatusChange = async (newStatus: string) => {
    if (!resolvedParams || !purchaseOrder) return
    if (newStatus === purchaseOrder.status) return

    setChangingStatus(true)
    try {
      const response = await fetch(`/api/purchase-orders/${resolvedParams.id}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: newStatus }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "ステータスの更新に失敗しました")
      }

      const { purchaseOrder: updated } = await response.json()
      setPurchaseOrder(updated)
      toast.success("ステータスを更新しました")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "ステータスの更新に失敗しました")
      // エラー時は元の状態に戻す
      fetchPurchaseOrder()
    } finally {
      setChangingStatus(false)
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
      <div className="mb-6 flex items-center justify-between">
        <Button variant="ghost" asChild>
          <Link href="/purchase-orders">
            <ArrowLeft className="mr-2 h-4 w-4" />
            戻る
          </Link>
        </Button>
        <div className="flex gap-2">
          <Button onClick={handleDownloadPDF}>
            <Download className="mr-2 h-4 w-4" />
            PDFダウンロード
          </Button>
          <Button variant="outline" onClick={handleDuplicate}>
            <Copy className="mr-2 h-4 w-4" />
            複製
          </Button>
          {canEdit() && (
            <Button asChild>
              <Link href={`/purchase-orders/${purchaseOrder.id}/edit`}>
                <Pencil className="mr-2 h-4 w-4" />
                編集
              </Link>
            </Button>
          )}
          {canDelete() && (
            <Button variant="destructive" onClick={handleDelete}>
              <Trash className="mr-2 h-4 w-4" />
              削除
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>発注書詳細</CardTitle>
            <div className="flex items-center gap-3">
              {canChangeStatus() && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">ステータス:</span>
                  <Select
                    value={purchaseOrder.status}
                    onValueChange={handleStatusChange}
                    disabled={changingStatus}
                  >
                    <SelectTrigger className="w-[140px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">下書き</SelectItem>
                      <SelectItem value="sent">送付済</SelectItem>
                      <SelectItem value="approved">承認済</SelectItem>
                      <SelectItem value="rejected">却下</SelectItem>
                      <SelectItem value="closed">完了</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
              <Badge variant={statusColors[purchaseOrder.status]}>
                {statusLabels[purchaseOrder.status]}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 基本情報 */}
          <div>
            <h3 className="text-lg font-semibold mb-4">基本情報</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">発注書番号</p>
                <p className="font-medium">{purchaseOrder.orderNumber}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">件名</p>
                <p className="font-medium">{purchaseOrder.subject}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">発行日</p>
                <p className="font-medium">
                  {format(new Date(purchaseOrder.issueDate), "yyyy年MM月dd日", { locale: ja })}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">納期</p>
                <p className="font-medium">
                  {purchaseOrder.deliveryDate
                    ? format(new Date(purchaseOrder.deliveryDate), "yyyy年MM月dd日", { locale: ja })
                    : "-"}
                </p>
              </div>
              {purchaseOrder.completionPeriod && (
                <div>
                  <p className="text-sm text-muted-foreground">検収完了期間</p>
                  <p className="font-medium">{purchaseOrder.completionPeriod}</p>
                </div>
              )}
              {purchaseOrder.deliveryLocation && (
                <div>
                  <p className="text-sm text-muted-foreground">納入場所</p>
                  <p className="font-medium">{purchaseOrder.deliveryLocation}</p>
                </div>
              )}
              {purchaseOrder.paymentTerms && (
                <div>
                  <p className="text-sm text-muted-foreground">お支払い条件</p>
                  <p className="font-medium">{purchaseOrder.paymentTerms}</p>
                </div>
              )}
              <div>
                <p className="text-sm text-muted-foreground">担当者</p>
                <p className="font-medium">
                  {purchaseOrder.user.lastName} {purchaseOrder.user.firstName}
                </p>
              </div>
            </div>
          </div>

          <Separator />

          {/* 発注先情報 */}
          <div>
            <h3 className="text-lg font-semibold mb-4">発注先情報</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">会社名</p>
                <p className="font-medium">
                  {purchaseOrder.supplier.name} {purchaseOrder.honorific}
                </p>
              </div>
              {purchaseOrder.supplier.address && (
                <div>
                  <p className="text-sm text-muted-foreground">住所</p>
                  <p className="font-medium">
                    〒{purchaseOrder.supplier.postalCode}<br />
                    {purchaseOrder.supplier.address} {purchaseOrder.supplier.building}
                  </p>
                </div>
              )}
              {purchaseOrder.supplier.phone && (
                <div>
                  <p className="text-sm text-muted-foreground">電話番号</p>
                  <p className="font-medium">{purchaseOrder.supplier.phone}</p>
                </div>
              )}
              {purchaseOrder.supplier.fax && (
                <div>
                  <p className="text-sm text-muted-foreground">FAX</p>
                  <p className="font-medium">{purchaseOrder.supplier.fax}</p>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* 明細 */}
          <div>
            <h3 className="text-lg font-semibold mb-4">明細</h3>
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-muted">
                  <tr>
                    <th className="text-left p-2">品名</th>
                    <th className="text-right p-2">数量</th>
                    <th className="text-left p-2">単位</th>
                    <th className="text-right p-2">単価</th>
                    <th className="text-right p-2">税率</th>
                    <th className="text-right p-2">金額</th>
                  </tr>
                </thead>
                <tbody>
                  {purchaseOrder.items.map((item) => (
                    <tr key={item.id} className="border-t">
                      <td className="p-2">
                        {item.name}
                        {item.remarks && (
                          <p className="text-sm text-muted-foreground">{item.remarks}</p>
                        )}
                      </td>
                      <td className="text-right p-2">{item.quantity}</td>
                      <td className="p-2">{item.unit || "-"}</td>
                      <td className="text-right p-2">¥{item.unitPrice.toLocaleString()}</td>
                      <td className="text-right p-2">{item.taxRate}%</td>
                      <td className="text-right p-2">¥{item.amount.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <Separator />

          {/* 金額情報 */}
          <div>
            <h3 className="text-lg font-semibold mb-4">金額情報</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">小計</p>
                <p className="font-medium">¥{purchaseOrder.subtotal.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">消費税</p>
                <p className="font-medium">¥{purchaseOrder.taxAmount.toLocaleString()}</p>
                {purchaseOrder.taxAmount8 > 0 && (
                  <p className="text-sm text-muted-foreground">
                    (8%: ¥{purchaseOrder.taxAmount8.toLocaleString()})
                  </p>
                )}
                {purchaseOrder.taxAmount10 > 0 && (
                  <p className="text-sm text-muted-foreground">
                    (10%: ¥{purchaseOrder.taxAmount10.toLocaleString()})
                  </p>
                )}
              </div>
              <div>
                <p className="text-sm text-muted-foreground">合計金額</p>
                <p className="text-xl font-bold">¥{purchaseOrder.totalAmount.toLocaleString()}</p>
              </div>
            </div>
          </div>

          {purchaseOrder.remarks && (
            <>
              <Separator />
              <div>
                <h3 className="text-lg font-semibold mb-4">備考</h3>
                <p className="whitespace-pre-wrap">{purchaseOrder.remarks}</p>
              </div>
            </>
          )}

          <Separator />

          {/* メタ情報 */}
          <div className="text-sm text-muted-foreground">
            <p>作成日時: {format(new Date(purchaseOrder.createdAt), "yyyy年MM月dd日 HH:mm", { locale: ja })}</p>
            <p>更新日時: {format(new Date(purchaseOrder.updatedAt), "yyyy年MM月dd日 HH:mm", { locale: ja })}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}