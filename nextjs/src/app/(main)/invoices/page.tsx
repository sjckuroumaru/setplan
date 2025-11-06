"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useInvoices } from "@/hooks/use-invoices"
import { usePagination } from "@/hooks/use-pagination"
import { config } from "@/lib/config"
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
  const { data: session, status } = useSession()
  const router = useRouter()
  const {
    currentPage,
    pagination,
    setPagination,
    goToNextPage,
    goToPreviousPage,
    resetToFirstPage,
    hasPreviousPage,
    hasNextPage,
  } = usePagination({ defaultLimit: 10 })
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")

  // 認証チェック
  useEffect(() => {
    if (status === "loading") return
    if (!session) {
      router.push("/login")
      return
    }
  }, [session, status, router])

  // SWRフックでデータ取得
  const { invoices, pagination: swrPagination, isLoading, isError, mutate } = useInvoices({
    page: currentPage,
    limit: pagination.limit,
    status: statusFilter,
    search: searchTerm,
  })

  // SWRのpaginationで更新
  useEffect(() => {
    if (swrPagination) {
      setPagination(prev => ({
        ...prev,
        page: swrPagination.currentPage,
        total: swrPagination.total,
        totalPages: swrPagination.totalPages,
      }))
    }
  }, [swrPagination?.currentPage, swrPagination?.total, swrPagination?.totalPages, setPagination])

  // フィルター・検索変更時はページを1に戻す
  useEffect(() => {
    if (session) {
      resetToFirstPage()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, searchTerm])

  const handleDelete = async (id: string) => {
    if (!confirm("この請求書を削除してもよろしいですか？")) return

    try {
      const response = await fetch(`/api/invoices/${id}`, {
        method: "DELETE",
      })
      if (!response.ok) throw new Error()

      toast.success("請求書を削除しました")
      mutate() // SWRでデータ再取得
    } catch {
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
    } catch {
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
      mutate() // SWRでデータ再取得
    } catch {
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


  if (status === "loading" || !session) {
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
            <SelectItem value="sent">入金待ち</SelectItem>
            <SelectItem value="paid">入金済</SelectItem>
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
                    <Link
                      href={`/invoices/${invoice.id}`}
                      className="text-blue-600 hover:text-blue-800 hover:underline"
                    >
                      {invoice.invoiceNumber}
                    </Link>
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
                              入金待ちにする
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
            全 {pagination.total} 件中 {(currentPage - 1) * pagination.limit + 1} -
            {Math.min(currentPage * pagination.limit, pagination.total)} 件を表示
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={goToPreviousPage}
              disabled={!hasPreviousPage || isLoading}
            >
              前へ
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={goToNextPage}
              disabled={!hasNextPage || isLoading}
            >
              次へ
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}