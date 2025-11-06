"use client"

import { useState, useEffect, use } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { StatusBadge } from "@/components/documents/status-badge"
import { INVOICE_STATUS, type InvoiceStatus } from "@/types/document"
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  ArrowLeft,
  Copy,
  Edit,
  Trash2,
  MoreVertical,
  Download,
  Send,
  CheckCircle,
  XCircle,
} from "lucide-react"
import { toast } from "sonner"

interface InvoiceDetail {
  id: string
  invoiceNumber: string
  issueDate: string
  dueDate: string
  honorific: string
  subject: string
  subtotal: string
  taxAmount: string
  taxAmount8: string
  taxAmount10: string
  totalAmount: string
  remarks: string | null
  status: InvoiceStatus
  paidAmount: string
  paidDate: string | null
  customer: {
    id: string
    name: string
    postalCode: string | null
    address: string | null
    building: string | null
  }
  user: {
    id: string
    lastName: string
    firstName: string
  }
  estimate: {
    id: string
    estimateNumber: string
  } | null
  items: Array<{
    id: string
    name: string
    quantity: string
    unit: string | null
    unitPrice: string
    taxType: string
    taxRate: number
    amount: string
    displayOrder: number
  }>
}


export default function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const resolvedParams = use(params)
  const { data: session } = useSession()
  const router = useRouter()
  const [invoice, setInvoice] = useState<InvoiceDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchInvoice = async () => {
      try {
        const response = await fetch(`/api/invoices/${resolvedParams.id}`)
        if (!response.ok) throw new Error()
        
        const data = await response.json()
        setInvoice(data.invoice)
      } catch {
        toast.error("請求書の取得に失敗しました")
        router.push("/invoices")
      } finally {
        setIsLoading(false)
      }
    }

    if (session) {
      fetchInvoice()
    }
  }, [session, resolvedParams.id, router])

  const handleDelete = async () => {
    if (!confirm("この請求書を削除してもよろしいですか？")) return

    try {
      const response = await fetch(`/api/invoices/${resolvedParams.id}`, {
        method: "DELETE",
      })
      if (!response.ok) throw new Error()
      
      toast.success("請求書を削除しました")
      router.push("/invoices")
    } catch {
      toast.error("削除に失敗しました")
    }
  }

  const handleDuplicate = async () => {
    try {
      const response = await fetch(`/api/invoices/${resolvedParams.id}/duplicate`, {
        method: "POST",
      })
      if (!response.ok) throw new Error()
      
      const data = await response.json()
      toast.success("請求書を複製しました")
      router.push(`/invoices/${data.invoice.id}/edit`)
    } catch {
      toast.error("複製に失敗しました")
    }
  }

  const handleStatusUpdate = async (status: string) => {
    try {
      const response = await fetch(`/api/invoices/${resolvedParams.id}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      })
      if (!response.ok) throw new Error()
      
      toast.success("ステータスを更新しました")
      
      // 請求書を再取得
      const invoiceResponse = await fetch(`/api/invoices/${resolvedParams.id}`)
      const data = await invoiceResponse.json()
      setInvoice(data.invoice)
    } catch {
      toast.error("ステータスの更新に失敗しました")
    }
  }

  const handlePDFDownload = async () => {
    if (!invoice) return
    
    const { downloadPDF } = await import("@/lib/pdf-utils")
    await downloadPDF(
      `/api/invoices/${resolvedParams.id}/pdf`,
      `${invoice.invoiceNumber}.pdf`
    )
  }

  const formatCurrency = (amount: string) => {
    const num = parseFloat(amount)
    return new Intl.NumberFormat("ja-JP", {
      style: "currency",
      currency: "JPY",
    }).format(num)
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`
  }

  if (isLoading || !invoice) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/invoices")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="text-3xl font-bold tracking-tight">請求書詳細</h2>
            <p className="text-muted-foreground">
              {invoice.invoiceNumber}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge 
            status={invoice.status} 
            config={INVOICE_STATUS[invoice.status]}
            showIcon={true}
          />
          <Button onClick={handlePDFDownload}>
            <Download className="mr-2 h-4 w-4" />
            PDF
          </Button>
          {invoice.status === "draft" && (
            <Button
              variant="outline"
              onClick={() => router.push(`/invoices/${invoice.id}/edit`)}
            >
              <Edit className="mr-2 h-4 w-4" />
              編集
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>操作</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {invoice.status === "draft" && (
                <DropdownMenuItem onClick={() => handleStatusUpdate("sent")}>
                  <Send className="mr-2 h-4 w-4" />
                  入金待ちにする
                </DropdownMenuItem>
              )}
              {invoice.status === "sent" && (
                <DropdownMenuItem onClick={() => handleStatusUpdate("paid")}>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  入金済みにする
                </DropdownMenuItem>
              )}
              {(invoice.status === "sent" || invoice.status === "paid") && (
                <DropdownMenuItem onClick={() => handleStatusUpdate("cancelled")}>
                  <XCircle className="mr-2 h-4 w-4" />
                  キャンセル
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={handleDuplicate}>
                <Copy className="mr-2 h-4 w-4" />
                複製
              </DropdownMenuItem>
              {session?.user?.isAdmin && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={handleDelete}
                    className="text-red-600"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    削除
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>基本情報</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">請求日</p>
                <p className="text-sm">{formatDate(invoice.issueDate)}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">支払期限</p>
                <p className="text-sm">{formatDate(invoice.dueDate)}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">件名</p>
                <p className="text-sm">{invoice.subject}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">担当者</p>
                <p className="text-sm">
                  {invoice.user.lastName} {invoice.user.firstName}
                </p>
              </div>
              {invoice.estimate && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">元見積書</p>
                  <Button
                    variant="link"
                    className="h-auto p-0 text-sm"
                    onClick={() => router.push(`/estimates/${invoice.estimate!.id}`)}
                  >
                    {invoice.estimate.estimateNumber}
                  </Button>
                </div>
              )}
              {invoice.status === "paid" && invoice.paidDate && (
                <>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">入金日</p>
                    <p className="text-sm">{formatDate(invoice.paidDate)}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">入金額</p>
                    <p className="text-sm">{formatCurrency(invoice.paidAmount)}</p>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>顧客情報</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="font-medium">{invoice.customer.name} {invoice.honorific}</p>
            {invoice.customer.postalCode && (
              <p className="text-sm text-muted-foreground">
                〒{invoice.customer.postalCode}
              </p>
            )}
            {invoice.customer.address && (
              <p className="text-sm text-muted-foreground">
                {invoice.customer.address} {invoice.customer.building || ""}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>明細</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>項目</TableHead>
                <TableHead className="text-center">数量</TableHead>
                <TableHead className="text-center">単位</TableHead>
                <TableHead className="text-right">単価</TableHead>
                <TableHead className="text-center">税率</TableHead>
                <TableHead className="text-right">金額</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoice.items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{item.name}</TableCell>
                  <TableCell className="text-center">
                    {parseFloat(item.quantity).toLocaleString("ja-JP")}
                  </TableCell>
                  <TableCell className="text-center">{item.unit || "-"}</TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(item.unitPrice)}
                  </TableCell>
                  <TableCell className="text-center">
                    {item.taxType === "non-taxable" ? "非課税" : 
                     item.taxType === "tax-included" ? "税込" : 
                     `${item.taxRate}%`}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(item.amount)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <Separator className="my-4" />

          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">小計</span>
              <span className="text-sm">{formatCurrency(invoice.subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">消費税</span>
              <span className="text-sm">{formatCurrency(invoice.taxAmount)}</span>
            </div>
            {parseFloat(invoice.taxAmount8) > 0 && (
              <div className="flex justify-between pl-4">
                <span className="text-xs text-muted-foreground">（8%対象）</span>
                <span className="text-xs">{formatCurrency(invoice.taxAmount8)}</span>
              </div>
            )}
            {parseFloat(invoice.taxAmount10) > 0 && (
              <div className="flex justify-between pl-4">
                <span className="text-xs text-muted-foreground">（10%対象）</span>
                <span className="text-xs">{formatCurrency(invoice.taxAmount10)}</span>
              </div>
            )}
            <Separator />
            <div className="flex justify-between text-lg font-semibold">
              <span>合計</span>
              <span>{formatCurrency(invoice.totalAmount)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {invoice.remarks && (
        <Card>
          <CardHeader>
            <CardTitle>備考</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{invoice.remarks}</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}