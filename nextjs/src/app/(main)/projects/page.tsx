"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useProjects } from "@/hooks/use-projects"
import { useDepartments } from "@/hooks/use-departments"
import { usePagination } from "@/hooks/use-pagination"
import { config } from "@/lib/config"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
  AlertCircle,
  SlidersHorizontal,
  RotateCcw,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
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

const projectTypeLabels = {
  development: "開発",
  ses: "SES",
  maintenance: "保守",
  internal: "社内業務",
  product: "自社サービス",
  other: "その他",
}

type SortColumn =
  | "projectNumber"
  | "projectType"
  | "projectName"
  | "departmentName"
  | "status"
  | "plannedStartDate"
  | "plannedEndDate"
  | "budget"
  | "updatedAt"

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
  const [departmentFilter, setDepartmentFilter] = useState("all")
  const [deleteProjectId, setDeleteProjectId] = useState<string | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [appliedSearchQuery, setAppliedSearchQuery] = useState("")
  const [appliedStatusFilter, setAppliedStatusFilter] = useState("all")
  const [appliedDepartmentFilter, setAppliedDepartmentFilter] = useState("all")
  const [sortBy, setSortBy] = useState<SortColumn>("updatedAt")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")
  const [isDepartmentInitialized, setIsDepartmentInitialized] = useState(false)

  // SWRフックでデータ取得
  const { projects, pagination: swrPagination, isLoading, isError, mutate } = useProjects({
    page: currentPage,
    limit: pagination.limit,
    status: appliedStatusFilter !== "all" ? appliedStatusFilter : undefined,
    departmentId: appliedDepartmentFilter !== "all" ? appliedDepartmentFilter : undefined,
    searchQuery: appliedSearchQuery || undefined,
    sortBy,
    sortOrder,
  })
  const { departments } = useDepartments()

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

  // フィルター適用時にページを1に戻す
  useEffect(() => {
    resetToFirstPage()
  }, [appliedSearchQuery, appliedStatusFilter, appliedDepartmentFilter, sortBy, sortOrder, resetToFirstPage])

  const hasPendingFilterChanges =
    searchQuery !== appliedSearchQuery ||
    statusFilter !== appliedStatusFilter ||
    departmentFilter !== appliedDepartmentFilter

  // 初期フィルター適用（部署）
  useEffect(() => {
    if (!session || departments.length === 0) {
      return
    }
    // 既に初期化済みならスキップ
    if (isDepartmentInitialized) {
      return
    }

    const departmentExists = session.user.departmentId
      ? departments.some((dept) => dept.id === session.user.departmentId)
      : false

    if (departmentExists) {
      const defaultDept = session.user.departmentId!
      setDepartmentFilter(defaultDept)
      setAppliedDepartmentFilter(defaultDept)
    }

    // 初期化完了をマーク
    setIsDepartmentInitialized(true)
  }, [session, departments, isDepartmentInitialized])

  const handleApplyFilters = () => {
    const normalizedSearch = searchQuery.trim()
    setSearchQuery(normalizedSearch)
    setAppliedSearchQuery(normalizedSearch)
    setAppliedStatusFilter(statusFilter)
    setAppliedDepartmentFilter(departmentFilter)
  }

  const handleClearFilters = () => {
    const departmentExists = session?.user?.departmentId
      ? departments.some((dept) => dept.id === session.user.departmentId)
      : false
    const defaultDepartment = departmentExists ? session?.user?.departmentId ?? "all" : "all"

    setSearchQuery("")
    setStatusFilter("all")
    setDepartmentFilter(defaultDepartment || "all")
    setAppliedSearchQuery("")
    setAppliedStatusFilter("all")
    setAppliedDepartmentFilter(defaultDepartment || "all")
  }

  const handleSort = (column: SortColumn) => {
    if (sortBy === column) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"))
    } else {
      setSortBy(column)
      setSortOrder(column === "projectNumber" ? "asc" : "desc")
    }
  }

  const SortIcon = ({ column }: { column: SortColumn }) => {
    if (sortBy !== column) {
      return <ArrowUpDown className="ml-1 inline h-3 w-3 opacity-50" />
    }
    return sortOrder === "asc" ? (
      <ArrowUp className="ml-1 inline h-3 w-3" />
    ) : (
      <ArrowDown className="ml-1 inline h-3 w-3" />
    )
  }

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

  const formatCurrency = (value: number | string | null | undefined) => {
    if (value === null || value === undefined || value === "") return "-"
    const numeric = typeof value === "string" ? parseFloat(value) : value
    if (Number.isNaN(numeric) || numeric === undefined || numeric === null) {
      return "-"
    }
    return `¥${numeric.toLocaleString()}`
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
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="project-search">検索</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="project-search"
                    placeholder="案件番号、案件名で検索..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="status-filter">ステータス</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger id="status-filter">
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

              <div className="space-y-2">
                <Label htmlFor="department-filter">担当部署</Label>
                <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                  <SelectTrigger id="department-filter">
                    <SelectValue placeholder="担当部署を選択" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">すべて</SelectItem>
                    {departments.map((dept) => (
                      <SelectItem key={dept.id} value={dept.id}>
                        {dept.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex flex-col gap-3 border-t pt-4 mt-2 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <SlidersHorizontal className="h-4 w-4" />
                条件を変更したら「適用」で一覧を更新します
              </div>
              <div className="flex flex-wrap gap-2 justify-end">
                <Button type="button" variant="outline" onClick={handleClearFilters}>
                  <RotateCcw className="mr-2 h-4 w-4" />
                  クリア
                </Button>
                <Button
                  type="button"
                  onClick={handleApplyFilters}
                  disabled={!hasPendingFilterChanges}
                >
                  適用
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 案件一覧テーブル */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table className="text-xs [&_th]:px-2 [&_td]:px-2">
              <TableHeader>
                <TableRow>
                  <TableHead
                    className="min-w-[120px] cursor-pointer select-none"
                    onClick={() => handleSort("projectNumber")}
                  >
                    案件番号<SortIcon column="projectNumber" />
                  </TableHead>
                  <TableHead
                    className="min-w-[110px] cursor-pointer select-none"
                    onClick={() => handleSort("projectType")}
                  >
                    案件種別<SortIcon column="projectType" />
                  </TableHead>
                  <TableHead
                    className="min-w-[180px] cursor-pointer select-none"
                    onClick={() => handleSort("projectName")}
                  >
                    案件名<SortIcon column="projectName" />
                  </TableHead>
                  <TableHead
                    className="min-w-[150px] cursor-pointer select-none"
                    onClick={() => handleSort("departmentName")}
                  >
                    担当部署<SortIcon column="departmentName" />
                  </TableHead>
                  <TableHead
                    className="min-w-[110px] cursor-pointer select-none text-center"
                    onClick={() => handleSort("status")}
                  >
                    ステータス<SortIcon column="status" />
                  </TableHead>
                  <TableHead
                    className="min-w-[110px] cursor-pointer select-none text-center"
                    onClick={() => handleSort("plannedStartDate")}
                  >
                    開始予定<SortIcon column="plannedStartDate" />
                  </TableHead>
                  <TableHead
                    className="min-w-[110px] cursor-pointer select-none text-center"
                    onClick={() => handleSort("plannedEndDate")}
                  >
                    終了予定<SortIcon column="plannedEndDate" />
                  </TableHead>
                  <TableHead
                    className="min-w-[110px] cursor-pointer select-none text-right"
                    onClick={() => handleSort("budget")}
                  >
                    予算<SortIcon column="budget" />
                  </TableHead>
                  <TableHead className="min-w-[180px]">関連発注書</TableHead>
                  <TableHead
                    className="min-w-[110px] cursor-pointer select-none text-center"
                    onClick={() => handleSort("updatedAt")}
                  >
                    最終更新<SortIcon column="updatedAt" />
                  </TableHead>
                  <TableHead className="min-w-[120px] text-center">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 11 }).map((_, j) => (
                        <TableCell key={j}>
                          <Skeleton className="h-4 w-full" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : projects.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={11} className="text-center py-8">
                      案件が見つかりません
                    </TableCell>
                  </TableRow>
                ) : (
                  projects.map((project) => (
                    <TableRow
                      key={project.id}
                      className="hover:bg-muted/40 cursor-pointer"
                      onDoubleClick={() => router.push(`/projects/${project.id}/edit`)}
                    >
                      <TableCell className="font-semibold">
                        <Link href={`/projects/${project.id}/edit`} className="text-blue-600 hover:text-blue-800 hover:underline">
                          {project.projectNumber}
                        </Link>
                      </TableCell>
                      <TableCell>
                        {project.projectType
                          ? projectTypeLabels[project.projectType as keyof typeof projectTypeLabels] ||
                            project.projectType
                          : "-"}
                      </TableCell>
                      <TableCell className="font-medium">{project.projectName}</TableCell>
                      <TableCell>{project.department?.name || "-"}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant={statusVariants[project.status as keyof typeof statusVariants] || "secondary"}>
                          {statusLabels[project.status as keyof typeof statusLabels] || project.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">{formatDate(project.plannedStartDate)}</TableCell>
                      <TableCell className="text-center">{formatDate(project.plannedEndDate)}</TableCell>
                      <TableCell className="text-right font-semibold">{formatCurrency(project.budget)}</TableCell>
                      <TableCell>
                        {project.purchaseOrder ? (
                          <div className="flex flex-col">
                            <span className="font-semibold">{project.purchaseOrder.orderNumber}</span>
                            <span className="text-[10px] text-muted-foreground truncate max-w-[160px]">
                              {project.purchaseOrder.subject}
                            </span>
                          </div>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell className="text-center">{formatDate(project.updatedAt)}</TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-2">
                          {session.user.isAdmin && (
                            <Button
                              variant="outline"
                              size="icon"
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
          </div>
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
