"use client"

import { useState, useEffect, useCallback } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { StatusBadge } from "@/components/documents/status-badge"
import { formatCurrency, formatDateShort } from "@/lib/utils/document"
import { INVOICE_STATUS, type InvoiceStatus } from "@/types/document"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Plus,
  Search,
  MoreHorizontal,
  FileText,
  Copy,
  Edit,
  Trash2,
  CheckCircle,
  Send,
  XCircle,
  Clock,
  AlertCircle,
} from "lucide-react"
import { toast } from "sonner"

interface Invoice {
  id: string
  invoiceNumber: string
  issueDate: string
  dueDate: string
  subject: string
  totalAmount: string
  status: InvoiceStatus
  customer: {
    id: string
    name: string
  }
  user: {
    id: string
    lastName: string
    firstName: string
  }
}

export default function InvoicesPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [pagination, setPagination] = useState({
    page: 1,
    totalPages: 1,
    total: 0,
  })
  const [shouldRefetch, setShouldRefetch] = useState(0)

  useEffect(() => {
    if (!session) return

    const fetchInvoices = async () => {
      try {
        setIsLoading(true)
        const params = new URLSearchParams({
          page: pagination.page.toString(),
          limit: "10",
          ...(statusFilter !== "all" && { status: statusFilter }),
          ...(searchTerm && { search: searchTerm }),
        })

        const response = await fetch(`/api/invoices?${params}`)
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          console.error("Invoice fetch error:", response.status, errorData)
          throw new Error(errorData.error || "Failed to fetch invoices")
        }

        const data = await response.json()
        console.log("Invoice data received:", data)
        setInvoices(data.invoices || [])
        setPagination(prev => ({
          ...prev,
          totalPages: data.totalPages || 1,
          total: data.total || 0,
        }))
      } catch (error) {
        console.error("Error fetching invoices:", error)
        toast.error("請求書の取得に失敗しました")
      } finally {
        setIsLoading(false)
      }
    }

    fetchInvoices()
  }, [session, pagination.page, statusFilter, searchTerm, shouldRefetch])

  const handleDelete = async (id: string) => {
    if (!confirm("この請求書を削除してもよろしいですか？")) return

    try {
      const response = await fetch(`/api/invoices/${id}`, {
        method: "DELETE",
      })
      if (!response.ok) throw new Error()
      
      toast.success("請求書を削除しました")
      setShouldRefetch(prev => prev + 1)
    } catch (error) {
      toast.error("削除に失敗しました")
    }
  }

  const handleDuplicate = async (id: string) => {
    try {
      const response = await fetch(`/api/invoices/${id}/duplicate`, {
        method: "POST",
      })
      if (!response.ok) throw new Error()
      
      const data = await response.json()
      toast.success("請求書を複製しました")
      router.push(`/invoices/${data.invoice.id}/edit`)
    } catch (error) {
      toast.error("複製に失敗しました")
    }
  }

  const handleStatusUpdate = async (id: string, status: string) => {
    try {
      const response = await fetch(`/api/invoices/${id}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      })
      if (!response.ok) throw new Error()
      
      toast.success("ステータスを更新しました")
      setShouldRefetch(prev => prev + 1)
    } catch (error) {
      toast.error("ステータスの更新に失敗しました")
    }
  }

  const handlePDFDownload = async (invoice: Invoice) => {
    const { downloadPDF } = await import("@/lib/pdf-utils")
    await downloadPDF(
      `/api/invoices/${invoice.id}/pdf`,
      `${invoice.invoiceNumber}.pdf`
    )
  }


  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">請求書管理</h2>
          <p className="text-muted-foreground">
            請求書の作成・管理を行います
          </p>
        </div>
        <Button onClick={() => router.push("/invoices/new")}>
          <Plus className="mr-2 h-4 w-4" />
          新規作成
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="請求書番号、件名、顧客名で検索"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="ステータス" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">すべて</SelectItem>
            <SelectItem value="draft">下書き</SelectItem>
            <SelectItem value="sent">送付済</SelectItem>
            <SelectItem value="paid">入金済</SelectItem>
            <SelectItem value="overdue">期限超過</SelectItem>
            <SelectItem value="cancelled">キャンセル</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>請求書番号</TableHead>
              <TableHead>顧客名</TableHead>
              <TableHead>件名</TableHead>
              <TableHead>請求日</TableHead>
              <TableHead>支払期限</TableHead>
              <TableHead className="text-right">金額</TableHead>
              <TableHead>ステータス</TableHead>
              <TableHead>担当者</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invoices.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8">
                  請求書がありません
                </TableCell>
              </TableRow>
            ) : (
              invoices.map((invoice) => (
                <TableRow key={invoice.id}>
                  <TableCell className="font-medium">
                    {invoice.invoiceNumber}
                  </TableCell>
                  <TableCell>{invoice.customer.name}</TableCell>
                  <TableCell>{invoice.subject}</TableCell>
                  <TableCell>{formatDateShort(invoice.issueDate)}</TableCell>
                  <TableCell>{formatDateShort(invoice.dueDate)}</TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(invoice.totalAmount)}
                  </TableCell>
                  <TableCell>
                    <StatusBadge 
                      status={invoice.status} 
                      config={INVOICE_STATUS[invoice.status]}
                      showIcon={true}
                    />
                  </TableCell>
                  <TableCell>
                    {invoice.user.lastName} {invoice.user.firstName}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => router.push(`/invoices/${invoice.id}`)}
                        >
                          <FileText className="mr-2 h-4 w-4" />
                          詳細
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handlePDFDownload(invoice)}
                        >
                          <FileText className="mr-2 h-4 w-4" />
                          PDF出力
                        </DropdownMenuItem>
                        {invoice.status === "draft" && (
                          <>
                            <DropdownMenuItem
                              onClick={() => router.push(`/invoices/${invoice.id}/edit`)}
                            >
                              <Edit className="mr-2 h-4 w-4" />
                              編集
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleStatusUpdate(invoice.id, "sent")}
                            >
                              <Send className="mr-2 h-4 w-4" />
                              送付済みにする
                            </DropdownMenuItem>
                          </>
                        )}
                        {invoice.status === "sent" && (
                          <DropdownMenuItem
                            onClick={() => handleStatusUpdate(invoice.id, "paid")}
                          >
                            <CheckCircle className="mr-2 h-4 w-4" />
                            入金済みにする
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem
                          onClick={() => handleDuplicate(invoice.id)}
                        >
                          <Copy className="mr-2 h-4 w-4" />
                          複製
                        </DropdownMenuItem>
                        {session?.user?.isAdmin && (
                          <DropdownMenuItem
                            onClick={() => handleDelete(invoice.id)}
                            className="text-red-600"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            削除
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            全 {pagination.total} 件中 {(pagination.page - 1) * 10 + 1} -
            {Math.min(pagination.page * 10, pagination.total)} 件を表示
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
              disabled={pagination.page === 1}
            >
              前へ
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
              disabled={pagination.page === pagination.totalPages}
            >
              次へ
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}