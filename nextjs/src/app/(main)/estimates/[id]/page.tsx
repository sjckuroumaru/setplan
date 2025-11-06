"use client"

import { useState, useEffect, use } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Separator } from "@/components/ui/separator"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  ArrowLeft,
  Edit,
  Download,
  Copy,
  Calendar,
  User,
  Building2,
  Receipt,
  ShoppingCart,
} from "lucide-react"
import { toast } from "sonner"

interface EstimateDetail {
  id: string
  estimateNumber: string
  subject: string
  issueDate: string
  validUntil: string
  subtotal: string
  taxAmount: string
  totalAmount: string
  taxType: string
  taxRate: number
  roundingType: string
  remarks: string | null
  status: string
  honorific: string
  customer: {
    id: string
    name: string
    postalCode: string | null
    address: string | null
    building: string | null
    representative: string | null
    phone: string | null
    fax: string | null
  }
  user: {
    id: string
    lastName: string
    firstName: string
    sealImagePath: string | null
  }
  items: {
    id: string
    name: string
    quantity: string
    unit: string | null
    unitPrice: string
    taxType: string
    amount: string
    remarks: string | null
    displayOrder: number
  }[]
}

const statusLabels: Record<string, string> = {
  draft: "下書き",
  sent: "送付済",
  accepted: "受注",
  rejected: "却下",
  expired: "失注",
}

const statusVariants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  draft: "secondary",
  sent: "default",
  accepted: "default",
  rejected: "destructive",
  expired: "outline",
}

const taxTypeLabels: Record<string, string> = {
  taxable: "課税",
  "non-taxable": "非課税",
  "tax-included": "税込",
}

export default function EstimateDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  const { data: session } = useSession()
  const router = useRouter()
  const [estimate, setEstimate] = useState<EstimateDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // 見積詳細取得
  useEffect(() => {
    const fetchEstimate = async () => {
      try {
        const response = await fetch(`/api/estimates/${resolvedParams.id}`)
        if (!response.ok) {
          if (response.status === 404) {
            toast.error("見積が見つかりません")
            router.push("/estimates")
            return
          }
          throw new Error()
        }
        
        const data = await response.json()
        setEstimate(data.estimate)
      } catch {
        toast.error("見積の取得に失敗しました")
        router.push("/estimates")
      } finally {
        setIsLoading(false)
      }
    }

    if (session) {
      fetchEstimate()
    }
  }, [session, resolvedParams.id, router])

  // 見積複製
  const handleDuplicate = async () => {
    try {
      const response = await fetch(`/api/estimates/${resolvedParams.id}/duplicate`, {
        method: "POST",
      })

      if (!response.ok) throw new Error()
      
      const data = await response.json()
      toast.success("見積を複製しました")
      router.push(`/estimates/${data.estimate.id}/edit`)
    } catch {
      toast.error("複製に失敗しました")
    }
  }

  // PDF直接ダウンロード
  const handlePDFDownload = async () => {
    if (!estimate) return
    
    const { downloadPDF } = await import("@/lib/pdf-utils")
    await downloadPDF(
      `/api/estimates/${resolvedParams.id}/pdf`,
      `${estimate.estimateNumber}.pdf`
    )
  }

  // 請求書作成
  const handleCreateInvoice = async () => {
    try {
      const response = await fetch("/api/invoices/from-estimate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estimateId: resolvedParams.id }),
      })
      if (!response.ok) throw new Error()
      
      const data = await response.json()
      toast.success("請求書を作成しました")
      router.push(`/invoices/${data.invoice.id}`)
    } catch {
      toast.error("請求書の作成に失敗しました")
    }
  }

  // 発注書作成
  const handleCreatePurchaseOrder = async () => {
    try {
      const response = await fetch("/api/purchase-orders/from-estimate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estimateId: resolvedParams.id }),
      })
      if (!response.ok) throw new Error()
      
      const data = await response.json()
      toast.success("発注書を作成しました")
      router.push(`/purchase-orders/${data.purchaseOrder.id}`)
    } catch {
      toast.error("発注書の作成に失敗しました")
    }
  }

  const formatCurrency = (amount: string) => {
    const num = parseFloat(amount)
    return new Intl.NumberFormat("ja-JP", {
      style: "currency",
      currency: "JPY",
    }).format(num)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("ja-JP", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-96 w-full" />
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!estimate) {
    return null
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/estimates")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="text-3xl font-bold tracking-tight">見積詳細</h2>
            <p className="text-muted-foreground">
              見積番号: {estimate.estimateNumber}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => router.push(`/estimates/${resolvedParams.id}/edit`)}
          >
            <Edit className="mr-2 h-4 w-4" />
            編集
          </Button>
          <Button
            variant="outline"
            onClick={handleDuplicate}
          >
            <Copy className="mr-2 h-4 w-4" />
            複製
          </Button>
          <Button
            variant="outline"
            onClick={handleCreateInvoice}
          >
            <Receipt className="mr-2 h-4 w-4" />
            請求書作成
          </Button>
          <Button
            variant="outline"
            onClick={handleCreatePurchaseOrder}
          >
            <ShoppingCart className="mr-2 h-4 w-4" />
            発注書作成
          </Button>
          <Button
            onClick={handlePDFDownload}
          >
            <Download className="mr-2 h-4 w-4" />
            PDF出力
          </Button>
        </div>
      </div>

      {/* 基本情報 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>基本情報</CardTitle>
            <Badge variant={statusVariants[estimate.status]}>
              {statusLabels[estimate.status]}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">顧客</p>
                  <p className="font-medium">{estimate.customer.name} {estimate.honorific}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">担当者</p>
                  <p className="font-medium">
                    {estimate.user.lastName} {estimate.user.firstName}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">発行日</p>
                  <p className="font-medium">{formatDate(estimate.issueDate)}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">有効期限</p>
                  <p className="font-medium">{formatDate(estimate.validUntil)}</p>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          <div>
            <p className="text-sm text-muted-foreground mb-1">件名</p>
            <p className="text-lg font-medium">{estimate.subject}</p>
          </div>
        </CardContent>
      </Card>

      {/* 顧客情報 */}
      <Card>
        <CardHeader>
          <CardTitle>顧客情報</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div>
            <span className="text-sm text-muted-foreground">会社名: </span>
            <span className="font-medium">{estimate.customer.name}</span>
          </div>
          {estimate.customer.representative && (
            <div>
              <span className="text-sm text-muted-foreground">代表者: </span>
              <span className="font-medium">{estimate.customer.representative}</span>
            </div>
          )}
          {estimate.customer.address && (
            <div>
              <span className="text-sm text-muted-foreground">住所: </span>
              <span className="font-medium">
                〒{estimate.customer.postalCode} {estimate.customer.address}
                {estimate.customer.building && ` ${estimate.customer.building}`}
              </span>
            </div>
          )}
          {estimate.customer.phone && (
            <div>
              <span className="text-sm text-muted-foreground">電話番号: </span>
              <span className="font-medium">{estimate.customer.phone}</span>
            </div>
          )}
          {estimate.customer.fax && (
            <div>
              <span className="text-sm text-muted-foreground">FAX: </span>
              <span className="font-medium">{estimate.customer.fax}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 明細 */}
      <Card>
        <CardHeader>
          <CardTitle>明細</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>項目名</TableHead>
                <TableHead className="text-right">数量</TableHead>
                <TableHead>単位</TableHead>
                <TableHead className="text-right">単価</TableHead>
                <TableHead>税区分</TableHead>
                <TableHead>備考</TableHead>
                <TableHead className="text-right">金額</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {estimate.items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell className="text-right">
                    {parseFloat(item.quantity).toLocaleString()}
                  </TableCell>
                  <TableCell>{item.unit || "-"}</TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(item.unitPrice)}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {taxTypeLabels[item.taxType]}
                    </Badge>
                  </TableCell>
                  <TableCell>{item.remarks || "-"}</TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(item.amount)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* 金額 */}
      <Card>
        <CardHeader>
          <CardTitle>金額</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">小計</span>
              <span className="font-medium">{formatCurrency(estimate.subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">
                消費税（{estimate.taxRate}%・{estimate.taxType === "inclusive" ? "税込" : "税別"}）
              </span>
              <span className="font-medium">{formatCurrency(estimate.taxAmount)}</span>
            </div>
            <Separator />
            <div className="flex justify-between text-lg">
              <span className="font-bold">合計</span>
              <span className="font-bold">{formatCurrency(estimate.totalAmount)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 備考 */}
      {estimate.remarks && (
        <Card>
          <CardHeader>
            <CardTitle>備考</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap">{estimate.remarks}</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}