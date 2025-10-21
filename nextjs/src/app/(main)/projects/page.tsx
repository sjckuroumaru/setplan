"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useProjects } from "@/hooks/use-projects"
import { usePagination } from "@/hooks/use-pagination"
import { config } from "@/lib/config"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Alert,
  AlertDescription,
} from "@/components/ui/alert"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2,
  AlertCircle
} from "lucide-react"

const statusLabels = {
  planning: "計画中",
  developing: "開発中",
  active: "稼働中",
  suspended: "停止中",
  completed: "完了",
}

const statusVariants = {
  planning: "secondary" as const,
  developing: "default" as const,
  active: "default" as const,
  suspended: "secondary" as const,
  completed: "outline" as const,
}

export default function ProjectsPage() {
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
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [deleteProjectId, setDeleteProjectId] = useState<string | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  // SWRフックでデータ取得
  const { projects, pagination: swrPagination, isLoading, isError, mutate } = useProjects({
    page: currentPage,
    limit: pagination.limit,
    status: statusFilter !== "all" ? statusFilter : undefined,
    searchQuery: searchQuery || undefined,
  })

  // 認証チェック
  useEffect(() => {
    if (status === "loading") return

    if (!session) {
      router.push("/login")
      return
    }
  }, [session, status, router])

  // SWRのpaginationで更新
  useEffect(() => {
    if (swrPagination) {
      setPagination({
        page: swrPagination.currentPage,
        limit: pagination.limit,
        total: swrPagination.totalCount,
        totalPages: swrPagination.totalPages,
      })
    }
  }, [swrPagination, setPagination, pagination.limit])

  // フィルター変更時にページを1に戻す
  useEffect(() => {
    if (session) {
      resetToFirstPage()
    }
  }, [searchQuery, statusFilter, resetToFirstPage])

  // 案件削除
  const handleDelete = async () => {
    if (!deleteProjectId) return

    try {
      setDeleteLoading(true)
      
      const response = await fetch(`/api/projects/${deleteProjectId}`, {
        method: "DELETE",
      })
      
      if (!response.ok) {
        const data = await response.json()
        const errorMessage = data.error || "案件の削除に失敗しました"
        toast.error(errorMessage)
        console.warn("Delete project warning:", errorMessage)
        setDeleteProjectId(null)
        return
      }
      
      toast.success("案件を削除しました")
      setDeleteProjectId(null)
      mutate() // SWRでデータ再取得
    } catch (error) {
      console.warn("Delete project warning:", error)
      const errorMessage = error instanceof Error ? error.message : "削除に失敗しました"
      toast.error(errorMessage)
      setDeleteProjectId(null)
    } finally {
      setDeleteLoading(false)
    }
  }

  // 日付フォーマット
  const formatDate = (dateString: string | null) => {
    if (!dateString) return "-"
    return new Date(dateString).toLocaleDateString("ja-JP")
  }

  if (status === "loading" || !session) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-[400px]" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">案件管理</h2>
          <p className="text-muted-foreground">
            案件の管理と進捗追跡
          </p>
        </div>
        {session.user.isAdmin && (
          <Button asChild>
            <Link href="/projects/new">
              <Plus className="mr-2 h-4 w-4" />
              新規案件
            </Link>
          </Button>
        )}
      </div>

      {isError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{isError.message || "エラーが発生しました"}</AlertDescription>
        </Alert>
      )}

      {/* フィルター */}
      <Card>
        <CardHeader>
          <CardTitle>フィルター</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="案件番号、案件名で検索..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="ステータス" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">すべて</SelectItem>
                <SelectItem value="planning">計画中</SelectItem>
                <SelectItem value="developing">開発中</SelectItem>
                <SelectItem value="active">稼働中</SelectItem>
                <SelectItem value="suspended">停止中</SelectItem>
                <SelectItem value="completed">完了</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* 案件一覧テーブル */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>案件番号</TableHead>
                <TableHead>案件名</TableHead>
                <TableHead>担当部署</TableHead>
                <TableHead>関連発注書</TableHead>
                <TableHead>ステータス</TableHead>
                <TableHead>開始予定日</TableHead>
                <TableHead>終了予定日</TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 8 }).map((_, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : projects.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    案件が見つかりません
                  </TableCell>
                </TableRow>
              ) : (
                projects.map((project) => (
                  <TableRow key={project.id}>
                    <TableCell>
                      <Link 
                        href={`/projects/${project.id}/edit`}
                        className="text-blue-600 hover:underline cursor-pointer"
                      >
                        {project.projectNumber}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{project.projectName}</div>
                        {project.description && (
                          <div className="text-sm text-muted-foreground line-clamp-2">
                            {project.description}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {project.department?.name || "-"}
                    </TableCell>
                    <TableCell>
                      {project.purchaseOrder ? (
                        <div className="text-sm">
                          <div className="font-medium">{project.purchaseOrder.orderNumber}</div>
                          <div className="text-muted-foreground truncate max-w-[150px]">
                            {project.purchaseOrder.subject}
                          </div>
                        </div>
                      ) : "-"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusVariants[project.status as keyof typeof statusVariants]}>
                        {statusLabels[project.status as keyof typeof statusLabels]}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatDate(project.plannedStartDate)}</TableCell>
                    <TableCell>{formatDate(project.plannedEndDate)}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          asChild
                        >
                          <Link href={`/projects/${project.id}/edit`}>
                            <Edit className="h-4 w-4" />
                          </Link>
                        </Button>
                        {session.user.isAdmin && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setDeleteProjectId(project.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* ページネーション */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
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

      {/* 削除確認ダイアログ */}
      <Dialog open={!!deleteProjectId} onOpenChange={() => setDeleteProjectId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>案件の削除</DialogTitle>
            <DialogDescription>
              本当にこの案件を削除しますか？関連する予定実績や課題がある場合は削除できません。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteProjectId(null)}
              disabled={deleteLoading}
            >
              キャンセル
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteLoading}
            >
              {deleteLoading ? "削除中..." : "削除"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}