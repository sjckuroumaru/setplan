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

type OrderConfirmationDetail = {
  id: string
  confirmationNumber: string
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

export default function OrderConfirmationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const router = useRouter()
  const { data: session } = useSession()
  const [orderConfirmation, setOrderConfirmation] = useState<OrderConfirmationDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [resolvedParams, setResolvedParams] = useState<{ id: string } | null>(null)
  const [changingStatus, setChangingStatus] = useState(false)

  useEffect(() => {
    params.then(setResolvedParams)
  }, [params])

  const fetchOrderConfirmation = useCallback(async () => {
    if (!resolvedParams) return

    try {
      const response = await fetch(`/api/order-confirmations/${resolvedParams.id}`)
      if (!response.ok) throw new Error()
      const data = await response.json()
      setOrderConfirmation(data)
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

  const handleDownloadPDF = async () => {
    if (!resolvedParams || !orderConfirmation) return

    const { downloadPDF } = await import("@/lib/pdf-utils")
    await downloadPDF(
      `/api/order-confirmations/${resolvedParams.id}/pdf`,
      `${orderConfirmation.confirmationNumber}.pdf`
    )
  }

  const handleDuplicate = async () => {
    if (!resolvedParams) return

    try {
      const response = await fetch(`/api/order-confirmations/${resolvedParams.id}/duplicate`, {
        method: "POST",
      })
      if (!response.ok) throw new Error()

      const duplicated = await response.json()
      router.push(`/order-confirmations/${duplicated.id}/edit`)

      toast.success("発注請書を複製しました")
    } catch {
      toast.error("発注請書の複製に失敗しました")
    }
  }

  const handleDelete = async () => {
    if (!resolvedParams) return
    if (!confirm("この発注請書を削除してもよろしいですか？")) return

    try {
      const response = await fetch(`/api/order-confirmations/${resolvedParams.id}`, {
        method: "DELETE",
      })
      if (!response.ok) throw new Error()

      router.push("/order-confirmations")
      toast.success("発注請書を削除しました")
    } catch {
      toast.error("発注請書の削除に失敗しました")
    }
  }

  const canEdit = () => {
    if (!session?.user || !orderConfirmation) return false
    return session.user.isAdmin || orderConfirmation.user.id === session.user.id
  }

  const canDelete = () => {
    if (!session?.user || !orderConfirmation) return false
    return (session.user.isAdmin || orderConfirmation.user.id === session.user.id) && orderConfirmation.status === "draft"
  }

  const canChangeStatus = () => {
    if (!session?.user || !orderConfirmation) return false
    return session.user.isAdmin || orderConfirmation.user.id === session.user.id
  }

  const handleStatusChange = async (newStatus: string) => {
    if (!resolvedParams || !orderConfirmation) return
    if (newStatus === orderConfirmation.status) return

    setChangingStatus(true)
    try {
      const response = await fetch(`/api/order-confirmations/${resolvedParams.id}/status`, {
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

      const { orderConfirmation: updated } = await response.json()
      setOrderConfirmation(updated)
      toast.success("ステータスを更新しました")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "ステータスの更新に失敗しました")
      // エラー時は元の状態に戻す
      fetchOrderConfirmation()
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

  if (!orderConfirmation) {
    return null
  }

  return (
    <div className="container mx-auto py-8">
      <div className="mb-6 flex items-center justify-between">
        <Button variant="ghost" asChild>
          <Link href="/order-confirmations">
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
              <Link href={`/order-confirmations/${orderConfirmation.id}/edit`}>
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
            <div>
              <CardTitle>発注請書詳細</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                発注請書番号: {orderConfirmation.confirmationNumber}
              </p>
            </div>
            <div className="flex items-center gap-3">
              {canChangeStatus() && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">ステータス:</span>
                  <Select
                    value={orderConfirmation.status}
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
              <Badge variant={statusColors[orderConfirmation.status]}>
                {statusLabels[orderConfirmation.status]}
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
                <p className="text-sm text-muted-foreground">発注請書番号</p>
                <p className="font-medium">{orderConfirmation.confirmationNumber}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">件名</p>
                <p className="font-medium">{orderConfirmation.subject}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">発行日</p>
                <p className="font-medium">
                  {format(new Date(orderConfirmation.issueDate), "yyyy年MM月dd日", { locale: ja })}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">納期</p>
                <p className="font-medium">
                  {orderConfirmation.deliveryDate
                    ? format(new Date(orderConfirmation.deliveryDate), "yyyy年MM月dd日", { locale: ja })
                    : "-"}
                </p>
              </div>
              {orderConfirmation.completionPeriod && (
                <div>
                  <p className="text-sm text-muted-foreground">検収完了期間</p>
                  <p className="font-medium">{orderConfirmation.completionPeriod}</p>
                </div>
              )}
              {orderConfirmation.deliveryLocation && (
                <div>
                  <p className="text-sm text-muted-foreground">納入場所</p>
                  <p className="font-medium">{orderConfirmation.deliveryLocation}</p>
                </div>
              )}
              {orderConfirmation.paymentTerms && (
                <div>
                  <p className="text-sm text-muted-foreground">お支払い条件</p>
                  <p className="font-medium">{orderConfirmation.paymentTerms}</p>
                </div>
              )}
              <div>
                <p className="text-sm text-muted-foreground">担当者</p>
                <p className="font-medium">
                  {orderConfirmation.user.lastName} {orderConfirmation.user.firstName}
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
                  {orderConfirmation.supplier.name} {orderConfirmation.honorific}
                </p>
              </div>
              {orderConfirmation.supplier.address && (
                <div>
                  <p className="text-sm text-muted-foreground">住所</p>
                  <p className="font-medium">
                    〒{orderConfirmation.supplier.postalCode}<br />
                    {orderConfirmation.supplier.address} {orderConfirmation.supplier.building}
                  </p>
                </div>
              )}
              {orderConfirmation.supplier.phone && (
                <div>
                  <p className="text-sm text-muted-foreground">電話番号</p>
                  <p className="font-medium">{orderConfirmation.supplier.phone}</p>
                </div>
              )}
              {orderConfirmation.supplier.fax && (
                <div>
                  <p className="text-sm text-muted-foreground">FAX</p>
                  <p className="font-medium">{orderConfirmation.supplier.fax}</p>
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
                  {orderConfirmation.items.map((item) => (
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
                <p className="font-medium">¥{orderConfirmation.subtotal.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">消費税</p>
                <p className="font-medium">¥{orderConfirmation.taxAmount.toLocaleString()}</p>
                {orderConfirmation.taxAmount8 > 0 && (
                  <p className="text-sm text-muted-foreground">
                    (8%: ¥{orderConfirmation.taxAmount8.toLocaleString()})
                  </p>
                )}
                {orderConfirmation.taxAmount10 > 0 && (
                  <p className="text-sm text-muted-foreground">
                    (10%: ¥{orderConfirmation.taxAmount10.toLocaleString()})
                  </p>
                )}
              </div>
              <div>
                <p className="text-sm text-muted-foreground">合計金額</p>
                <p className="text-xl font-bold">¥{orderConfirmation.totalAmount.toLocaleString()}</p>
              </div>
            </div>
          </div>

          {orderConfirmation.remarks && (
            <>
              <Separator />
              <div>
                <h3 className="text-lg font-semibold mb-4">備考</h3>
                <p className="whitespace-pre-wrap">{orderConfirmation.remarks}</p>
              </div>
            </>
          )}

          <Separator />

          {/* メタ情報 */}
          <div className="text-sm text-muted-foreground">
            <p>作成日時: {format(new Date(orderConfirmation.createdAt), "yyyy年MM月dd日 HH:mm", { locale: ja })}</p>
            <p>更新日時: {format(new Date(orderConfirmation.updatedAt), "yyyy年MM月dd日 HH:mm", { locale: ja })}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}