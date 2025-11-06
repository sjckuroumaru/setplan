"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useInvoices } from "@/hooks/use-invoices"
import { usePagination } from "@/hooks/use-pagination"
import { useUsers } from "@/hooks/use-users"
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
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
  FileDown,
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
  const [userFilter, setUserFilter] = useState("all")
  const [issueDateStart, setIssueDateStart] = useState("")
  const [issueDateEnd, setIssueDateEnd] = useState("")
  const [dueDateStart, setDueDateStart] = useState("")
  const [dueDateEnd, setDueDateEnd] = useState("")

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
    userId: userFilter !== "all" ? userFilter : undefined,
    issueDateStart: issueDateStart || undefined,
    issueDateEnd: issueDateEnd || undefined,
    dueDateStart: dueDateStart || undefined,
    dueDateEnd: dueDateEnd || undefined,
  })

  const { users: usersData } = useUsers({ limit: 1000, basic: true })

  // ユーザーリストを整形
  const users = usersData.map((user) => ({
    id: user.id,
    name: `${user.lastName} ${user.firstName}`,
  }))

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
  }, [statusFilter, searchTerm, userFilter, issueDateStart, issueDateEnd, dueDateStart, dueDateEnd])

  // フィルターリセット関数
  const handleResetFilters = () => {
    setSearchTerm("")
    setStatusFilter("all")
    setUserFilter("all")
    setIssueDateStart("")
    setIssueDateEnd("")
    setDueDateStart("")
    setDueDateEnd("")
  }

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

  const handleListPDFDownload = async () => {
    try {
      const response = await fetch("/api/invoices/list-pdf", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: statusFilter,
          search: searchTerm,
          userId: userFilter,
          issueDateStart: issueDateStart || undefined,
          issueDateEnd: issueDateEnd || undefined,
          dueDateStart: dueDateStart || undefined,
          dueDateEnd: dueDateEnd || undefined,
        }),
      })

      if (!response.ok) {
        throw new Error("PDF生成に失敗しました")
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `invoices-${new Date().toISOString().split("T")[0]}.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      toast.success("PDFをダウンロードしました")
    } catch (error) {
      toast.error("PDF生成に失敗しました")
    }
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
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleListPDFDownload}>
            <FileDown className="mr-2 h-4 w-4" />
            PDF出力
          </Button>
          <Button onClick={() => router.push("/invoices/new")}>
            <Plus className="mr-2 h-4 w-4" />
            新規作成
          </Button>
        </div>
      </div>

      {/* フィルター */}
      <Card>
        <CardHeader>
          <CardTitle>フィルター</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* 1行目 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="search">検索</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="search"
                    placeholder="請求書番号、件名、顧客名"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="status-filter">ステータス</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger id="status-filter">
                    <SelectValue placeholder="ステータスを選択" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">すべて</SelectItem>
                    <SelectItem value="draft">下書き</SelectItem>
                    <SelectItem value="sent">入金待ち</SelectItem>
                    <SelectItem value="paid">入金済</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="user-filter">担当者</Label>
                <Select value={userFilter} onValueChange={setUserFilter}>
                  <SelectTrigger id="user-filter">
                    <SelectValue placeholder="担当者を選択" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">すべて</SelectItem>
                    {users.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* 2行目 */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
              <div className="space-y-2">
                <Label htmlFor="issue-date-start">請求日（開始）</Label>
                <Input
                  id="issue-date-start"
                  type="date"
                  value={issueDateStart}
                  onChange={(e) => setIssueDateStart(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="issue-date-end">請求日（終了）</Label>
                <Input
                  id="issue-date-end"
                  type="date"
                  value={issueDateEnd}
                  onChange={(e) => setIssueDateEnd(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="due-date-start">支払期限（開始）</Label>
                <Input
                  id="due-date-start"
                  type="date"
                  value={dueDateStart}
                  onChange={(e) => setDueDateStart(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="due-date-end">支払期限（終了）</Label>
                <Input
                  id="due-date-end"
                  type="date"
                  value={dueDateEnd}
                  onChange={(e) => setDueDateEnd(e.target.value)}
                />
              </div>

              <div>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={handleResetFilters}
                >
                  クリア
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

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
              <TableHead className="text-right">変更</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invoices.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center py-8">
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
                        <DropdownMenuLabel>操作</DropdownMenuLabel>
                        <DropdownMenuSeparator />
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
                          <DropdownMenuItem
                            onClick={() => router.push(`/invoices/${invoice.id}/edit`)}
                          >
                            <Edit className="mr-2 h-4 w-4" />
                            編集
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem
                          onClick={() => handleDuplicate(invoice.id)}
                        >
                          <Copy className="mr-2 h-4 w-4" />
                          複製
                        </DropdownMenuItem>
                        {session?.user?.isAdmin && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => handleDelete(invoice.id)}
                              className="text-red-600"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              削除
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>ステータス変更</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => handleStatusUpdate(invoice.id, "draft")}
                          disabled={invoice.status === "draft"}
                        >
                          <Edit className="mr-2 h-4 w-4" />
                          下書き
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleStatusUpdate(invoice.id, "sent")}
                          disabled={invoice.status === "sent"}
                        >
                          <Send className="mr-2 h-4 w-4" />
                          入金待ち
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleStatusUpdate(invoice.id, "paid")}
                          disabled={invoice.status === "paid"}
                        >
                          <CheckCircle className="mr-2 h-4 w-4" />
                          入金済
                        </DropdownMenuItem>
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