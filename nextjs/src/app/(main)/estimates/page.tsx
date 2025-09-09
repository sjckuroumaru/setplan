"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
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
  const { data: session } = useSession()
  const router = useRouter()
  const [estimates, setEstimates] = useState<Estimate[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState("all")
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  // 見積一覧取得
  const fetchEstimates = async () => {
    try {
      setIsLoading(true)
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: "20",
      })
      
      if (statusFilter !== "all") {
        params.append("status", statusFilter)
      }

      const response = await fetch(`/api/estimates?${params}`)
      
      if (response.ok) {
        const data = await response.json()
        setEstimates(data.estimates)
        setTotalPages(data.totalPages)
      }
    } catch (error) {
      console.error("Failed to fetch estimates:", error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (session) {
      fetchEstimates()
    }
  }, [session, currentPage, statusFilter])

  // 見積削除
  const handleDelete = async (id: string) => {
    if (!confirm("この見積を削除してもよろしいですか？")) return

    try {
      const response = await fetch(`/api/estimates/${id}`, {
        method: "DELETE",
      })

      if (!response.ok) throw new Error()
      
      toast.success("見積を削除しました")
      fetchEstimates()
    } catch (error) {
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
    } catch (error) {
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
                <SelectItem value="accepted">承認済</SelectItem>
                <SelectItem value="rejected">却下</SelectItem>
                <SelectItem value="expired">期限切れ</SelectItem>
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
                  <TableHead className="w-[80px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {estimates.map((estimate) => (
                  <TableRow key={estimate.id}>
                    <TableCell className="font-mono">
                      {estimate.estimateNumber}
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
                        config={ESTIMATE_STATUS[estimate.status]}
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
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                前へ
              </Button>
              <span className="text-sm text-muted-foreground">
                {currentPage} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
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