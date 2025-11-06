"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useDeliveryNotes } from "@/hooks/use-delivery-notes"
import { usePagination } from "@/hooks/use-pagination"
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
import { StatusBadge } from "@/components/documents/status-badge"
import { formatCurrency, formatDateShort } from "@/lib/utils/document"
import { DELIVERY_NOTE_STATUS, type DeliveryNoteStatus } from "@/types/document"
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
  Send,
} from "lucide-react"
import { toast } from "sonner"

interface DeliveryNote {
  id: string
  deliveryNoteNumber: string
  deliveryDate: string
  subject: string
  totalAmount: string
  status: DeliveryNoteStatus
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

export default function DeliveryNotesPage() {
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
  const { deliveryNotes, pagination: swrPagination, isLoading, isError, mutate } = useDeliveryNotes({
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
  }, [statusFilter, searchTerm])

  const handleDelete = async (id: string) => {
    if (!confirm("この納品書を削除してもよろしいですか？")) return

    try {
      const response = await fetch(`/api/delivery-notes/${id}`, {
        method: "DELETE",
      })
      if (!response.ok) throw new Error()

      toast.success("納品書を削除しました")
      mutate() // SWRでデータ再取得
    } catch {
      toast.error("削除に失敗しました")
    }
  }

  const handleDuplicate = async (id: string) => {
    try {
      const response = await fetch(`/api/delivery-notes/${id}/duplicate`, {
        method: "POST",
      })
      if (!response.ok) throw new Error()

      const data = await response.json()
      toast.success("納品書を複製しました")
      router.push(`/delivery-notes/${data.deliveryNote.id}/edit`)
    } catch {
      toast.error("複製に失敗しました")
    }
  }

  const handleStatusUpdate = async (id: string, status: string) => {
    try {
      const response = await fetch(`/api/delivery-notes/${id}/status`, {
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

  const handlePDFDownload = async (deliveryNote: DeliveryNote) => {
    const { downloadPDF } = await import("@/lib/pdf-utils")
    await downloadPDF(
      `/api/delivery-notes/${deliveryNote.id}/pdf`,
      `${deliveryNote.deliveryNoteNumber}.pdf`
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
          <h2 className="text-3xl font-bold tracking-tight">納品書管理</h2>
          <p className="text-muted-foreground">
            納品書の作成・管理を行います
          </p>
        </div>
        <Button onClick={() => router.push("/delivery-notes/new")}>
          <Plus className="mr-2 h-4 w-4" />
          新規作成
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="納品書番号、件名、顧客名で検索"
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
            <SelectItem value="sent">送付済み</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>納品書番号</TableHead>
              <TableHead>顧客名</TableHead>
              <TableHead>件名</TableHead>
              <TableHead>納品日</TableHead>
              <TableHead className="text-right">金額</TableHead>
              <TableHead>ステータス</TableHead>
              <TableHead>担当者</TableHead>
              <TableHead className="text-right">操作</TableHead>
              <TableHead className="text-right">変更</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {deliveryNotes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8">
                  納品書がありません
                </TableCell>
              </TableRow>
            ) : (
              deliveryNotes.map((deliveryNote) => (
                <TableRow key={deliveryNote.id}>
                  <TableCell className="font-medium">
                    <Link
                      href={`/delivery-notes/${deliveryNote.id}`}
                      className="text-blue-600 hover:text-blue-800 hover:underline"
                    >
                      {deliveryNote.deliveryNoteNumber}
                    </Link>
                  </TableCell>
                  <TableCell>{deliveryNote.customer.name}</TableCell>
                  <TableCell>{deliveryNote.subject}</TableCell>
                  <TableCell>{formatDateShort(deliveryNote.deliveryDate)}</TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(deliveryNote.totalAmount)}
                  </TableCell>
                  <TableCell>
                    <StatusBadge
                      status={deliveryNote.status}
                      config={DELIVERY_NOTE_STATUS[deliveryNote.status as DeliveryNoteStatus]}
                      showIcon={true}
                    />
                  </TableCell>
                  <TableCell>
                    {deliveryNote.user.lastName} {deliveryNote.user.firstName}
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
                          onClick={() => router.push(`/delivery-notes/${deliveryNote.id}`)}
                        >
                          <FileText className="mr-2 h-4 w-4" />
                          詳細
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handlePDFDownload(deliveryNote)}
                        >
                          <FileText className="mr-2 h-4 w-4" />
                          PDF出力
                        </DropdownMenuItem>
                        {deliveryNote.status === "draft" && (
                          <DropdownMenuItem
                            onClick={() => router.push(`/delivery-notes/${deliveryNote.id}/edit`)}
                          >
                            <Edit className="mr-2 h-4 w-4" />
                            編集
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem
                          onClick={() => handleDuplicate(deliveryNote.id)}
                        >
                          <Copy className="mr-2 h-4 w-4" />
                          複製
                        </DropdownMenuItem>
                        {session?.user?.isAdmin && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => handleDelete(deliveryNote.id)}
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
                          onClick={() => handleStatusUpdate(deliveryNote.id, "draft")}
                          disabled={deliveryNote.status === "draft"}
                        >
                          <FileText className="mr-2 h-4 w-4" />
                          下書き
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleStatusUpdate(deliveryNote.id, "sent")}
                          disabled={deliveryNote.status === "sent"}
                        >
                          <Send className="mr-2 h-4 w-4" />
                          送付済
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
