"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useEstimates } from "@/hooks/use-estimates"
import { usePagination } from "@/hooks/use-pagination"
import { config } from "@/lib/config"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import {
  Plus,
  MoreHorizontal,
  FileText,
  Edit,
  Copy,
  Trash,
  Download,
  Eye,
  Send,
  CheckCircle,
  XCircle,
  Clock,
} from "lucide-react"
import { StatusBadge } from "@/components/documents/status-badge"
import { formatCurrency, formatDateShort } from "@/lib/utils/document"
import { ESTIMATE_STATUS, type EstimateStatus } from "@/types/document"

interface Estimate {
  id: string
  estimateNumber: string
  subject: string
  issueDate: string
  validUntil: string
  totalAmount: string
  status: EstimateStatus
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

export default function EstimatesPage() {
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
  } = usePagination({ defaultLimit: config.pagination.defaultLimit })
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
  const { estimates, pagination: swrPagination, isLoading, isError, mutate } = useEstimates({
    page: currentPage,
    limit: pagination.limit,
    status: statusFilter,
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

  // フィルター変更時はページを1に戻す
  useEffect(() => {
    if (session) {
      resetToFirstPage()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter])

  // 見積削除
  const handleDelete = async (id: string) => {
    if (!confirm("この見積を削除してもよろしいですか？")) return

    try {
      const response = await fetch(`/api/estimates/${id}`, {
        method: "DELETE",
      })

      if (!response.ok) throw new Error()

      toast.success("見積を削除しました")
      mutate() // SWRでデータ再取得
    } catch {
      toast.error("削除に失敗しました")
    }
  }

  // 見積複製
  const handleDuplicate = async (id: string) => {
    try {
      const response = await fetch(`/api/estimates/${id}/duplicate`, {
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
  const handlePDFDownload = async (id: string, estimateNumber: string) => {
    const { downloadPDF } = await import("@/lib/pdf-utils")
    await downloadPDF(
      `/api/estimates/${id}/pdf`,
      `${estimateNumber}.pdf`
    )
  }

  // ステータス更新
  const handleStatusUpdate = async (id: string, status: string) => {
    try {
      const response = await fetch(`/api/estimates/${id}/status`, {
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


  if (status === "loading" || !session) {
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">見積管理</h2>
          <p className="text-muted-foreground">
            見積書の作成と管理を行います
          </p>
        </div>
        <Button onClick={() => router.push("/estimates/new")}>
          <Plus className="mr-2 h-4 w-4" />
          新規見積
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>見積一覧</CardTitle>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="ステータス" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">すべて</SelectItem>
                <SelectItem value="draft">下書き</SelectItem>
                <SelectItem value="sent">送付済</SelectItem>
                <SelectItem value="accepted">受注</SelectItem>
                <SelectItem value="rejected">却下</SelectItem>
                <SelectItem value="expired">失注</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {estimates.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FileText className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold">見積がありません</h3>
              <p className="text-sm text-muted-foreground mt-2">
                新規見積を作成して管理を始めましょう
              </p>
              <Button 
                onClick={() => router.push("/estimates/new")} 
                variant="outline" 
                className="mt-4"
              >
                <Plus className="mr-2 h-4 w-4" />
                最初の見積を作成
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>見積番号</TableHead>
                  <TableHead>顧客名</TableHead>
                  <TableHead>件名</TableHead>
                  <TableHead>発行日</TableHead>
                  <TableHead>有効期限</TableHead>
                  <TableHead className="text-right">金額</TableHead>
                  <TableHead>ステータス</TableHead>
                  <TableHead>担当者</TableHead>
                  <TableHead className="w-[80px]">操作</TableHead>
                  <TableHead className="w-[80px]">変更</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {estimates.map((estimate) => (
                  <TableRow key={estimate.id}>
                    <TableCell className="font-mono">
                      <Link
                        href={`/estimates/${estimate.id}`}
                        className="text-blue-600 hover:text-blue-800 hover:underline"
                      >
                        {estimate.estimateNumber}
                      </Link>
                    </TableCell>
                    <TableCell>{estimate.customer.name}</TableCell>
                    <TableCell className="max-w-[200px] truncate">
                      {estimate.subject}
                    </TableCell>
                    <TableCell>{formatDateShort(estimate.issueDate)}</TableCell>
                    <TableCell>{formatDateShort(estimate.validUntil)}</TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(estimate.totalAmount)}
                    </TableCell>
                    <TableCell>
                      <StatusBadge
                        status={estimate.status}
                        config={ESTIMATE_STATUS[estimate.status as EstimateStatus]}
                        showIcon={true}
                      />
                    </TableCell>
                    <TableCell>
                      {estimate.user.lastName} {estimate.user.firstName}
                    </TableCell>
                    <TableCell>
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
                            onClick={() => router.push(`/estimates/${estimate.id}`)}
                          >
                            <Eye className="mr-2 h-4 w-4" />
                            詳細
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => router.push(`/estimates/${estimate.id}/edit`)}
                          >
                            <Edit className="mr-2 h-4 w-4" />
                            編集
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDuplicate(estimate.id)}
                          >
                            <Copy className="mr-2 h-4 w-4" />
                            複製
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handlePDFDownload(estimate.id, estimate.estimateNumber)}
                          >
                            <Download className="mr-2 h-4 w-4" />
                            PDF出力
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleDelete(estimate.id)}
                            className="text-destructive"
                          >
                            <Trash className="mr-2 h-4 w-4" />
                            削除
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                    <TableCell>
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
                            onClick={() => handleStatusUpdate(estimate.id, "draft")}
                            disabled={estimate.status === "draft"}
                          >
                            <FileText className="mr-2 h-4 w-4" />
                            下書き
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleStatusUpdate(estimate.id, "sent")}
                            disabled={estimate.status === "sent"}
                          >
                            <Send className="mr-2 h-4 w-4" />
                            送付済み
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleStatusUpdate(estimate.id, "accepted")}
                            disabled={estimate.status === "accepted"}
                          >
                            <CheckCircle className="mr-2 h-4 w-4" />
                            受注
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleStatusUpdate(estimate.id, "expired")}
                            disabled={estimate.status === "expired"}
                          >
                            <Clock className="mr-2 h-4 w-4" />
                            失注
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleStatusUpdate(estimate.id, "rejected")}
                            disabled={estimate.status === "rejected"}
                          >
                            <XCircle className="mr-2 h-4 w-4" />
                            却下
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={goToPreviousPage}
                disabled={!hasPreviousPage || isLoading}
              >
                前へ
              </Button>
              <span className="text-sm text-muted-foreground">
                {currentPage} / {pagination.totalPages}ページ （{pagination.total}件）
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={goToNextPage}
                disabled={!hasNextPage || isLoading}
              >
                次へ
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}