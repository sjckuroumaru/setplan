"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { usePagination } from "@/hooks/use-pagination"
import { useIssues } from "@/hooks/use-issues"
import { useProjects } from "@/hooks/use-projects"
import { useUsers } from "@/hooks/use-users"
import { useDepartments } from "@/hooks/use-departments"
import { IssueStats } from "@/components/features/issues/issue-stats"
import { PaginationControls } from "@/components/ui/pagination-controls"
import { config } from "@/lib/config"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { toast } from "sonner"
import {
  Plus,
  Search,
  MoreHorizontal,
  AlertCircle,
  CheckCircle2,
  Clock,
  CircleDot,
  MessageSquare,
  Calendar,
  Edit,
  Trash2,
  Eye,
  ArrowUpCircle,
  ArrowDownCircle,
  MinusCircle,
  Flag
} from "lucide-react"

// ステータスの定義
const statusConfig = {
  open: { label: "未対応", icon: CircleDot, color: "bg-blue-500" },
  in_progress: { label: "対応中", icon: Clock, color: "bg-yellow-500" },
  resolved: { label: "解決済", icon: CheckCircle2, color: "bg-green-500" },
  closed: { label: "クローズ", icon: AlertCircle, color: "bg-gray-500" },
}

// 優先度の定義
const priorityConfig = {
  critical: { label: "緊急", icon: Flag, color: "text-red-600" },
  high: { label: "高", icon: ArrowUpCircle, color: "text-red-500" },
  medium: { label: "中", icon: MinusCircle, color: "text-yellow-500" },
  low: { label: "低", icon: ArrowDownCircle, color: "text-blue-500" },
}

export default function IssuesPage() {
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
  const [priorityFilter, setPriorityFilter] = useState("all")
  const [projectFilter, setProjectFilter] = useState("all")
  const [assigneeFilter, setAssigneeFilter] = useState("all")
  const [departmentFilter, setDepartmentFilter] = useState("all")
  const [deleteIssueId, setDeleteIssueId] = useState<string | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [filtersInitialized, setFiltersInitialized] = useState(false)

  // SWRフックでデータ取得
  const { issues, pagination: swrPagination, isLoading, isError, mutate } = useIssues({
    page: currentPage,
    limit: pagination.limit,
    status: statusFilter !== "all" ? statusFilter : undefined,
    priority: priorityFilter !== "all" ? priorityFilter : undefined,
    projectId: projectFilter !== "all" ? projectFilter : undefined,
    assigneeId: assigneeFilter !== "all" ? assigneeFilter : undefined,
    departmentId: departmentFilter !== "all" ? departmentFilter : undefined,
    searchQuery: searchQuery || undefined,
  })

  const { projects } = useProjects({ page: 1, limit: 1000 })
  const { users: usersData } = useUsers({ limit: 1000, basic: true })
  const { departments } = useDepartments()

  // ユーザーリストを整形
  const users = usersData.map((user) => ({
    id: user.id,
    name: `${user.lastName} ${user.firstName}`,
    employeeNumber: user.employeeNumber,
  }))

  // 認証チェック
  useEffect(() => {
    if (status === "loading") return

    if (!session) {
      router.push("/login")
      return
    }
  }, [session, status, router])

  // 初期フィルター適用
  useEffect(() => {
    // 初期化済み、セッションなし、または部署データ未取得の場合は早期リターン
    if (!session || filtersInitialized || departments.length === 0) {
      return
    }

    // 部署フィルターの設定
    const userDeptId = session.user.departmentId
    if (userDeptId) {
      // ユーザーの所属部署が実際に存在するか確認
      const deptExists = departments.some(dept => dept.id === userDeptId)
      if (deptExists) {
        setDepartmentFilter(userDeptId)
      } else {
        // 部署が見つからない場合は"all"を設定
        console.warn(`ユーザーの部署ID ${userDeptId} が部署リストに見つかりません`)
        setDepartmentFilter("all")
      }
    } else {
      // departmentIdが設定されていない場合は"all"を設定
      setDepartmentFilter("all")
    }

    // 担当者フィルターの設定（管理者以外は自身のIDをデフォルト設定）
    if (!session.user.isAdmin) {
      setAssigneeFilter(session.user.id)
    }

    setFiltersInitialized(true)
  }, [session, filtersInitialized, departments])

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
  }, [searchQuery, statusFilter, priorityFilter, projectFilter, assigneeFilter, departmentFilter, resetToFirstPage])

  // 課題削除
  const handleDelete = async () => {
    if (!deleteIssueId) return

    try {
      setDeleteLoading(true)
      
      const response = await fetch(`/api/issues/${deleteIssueId}`, {
        method: "DELETE",
      })
      
      if (!response.ok) {
        const data = await response.json()
        const errorMessage = data.error || "課題の削除に失敗しました"
        toast.error(errorMessage)
        console.warn("Delete issue warning:", errorMessage)
        setDeleteIssueId(null)
        return
      }
      
      toast.success("課題を削除しました")
      setDeleteIssueId(null)
      mutate() // SWRでデータ再取得
    } catch (error) {
      console.warn("Delete issue warning:", error)
      const errorMessage = error instanceof Error ? error.message : "削除に失敗しました"
      toast.error(errorMessage)
      setDeleteIssueId(null)
    } finally {
      setDeleteLoading(false)
    }
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
          <h2 className="text-3xl font-bold tracking-tight">課題管理</h2>
          <p className="text-muted-foreground">
            案件の課題を追跡・管理
          </p>
        </div>
        <Link href="/issues/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            新規課題
          </Button>
        </Link>
      </div>

      {/* 統計カード */}
      <IssueStats
        departmentId={departmentFilter}
        projectId={projectFilter}
        assigneeId={assigneeFilter}
      />

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
                    placeholder="課題を検索..."
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
                    <SelectItem value="open">未対応</SelectItem>
                    <SelectItem value="in_progress">対応中</SelectItem>
                    <SelectItem value="resolved">解決済</SelectItem>
                    <SelectItem value="closed">クローズ</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="priority-filter">優先度</Label>
                <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                  <SelectTrigger id="priority-filter">
                    <SelectValue placeholder="優先度" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">すべて</SelectItem>
                    <SelectItem value="high">高</SelectItem>
                    <SelectItem value="medium">中</SelectItem>
                    <SelectItem value="low">低</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* 2行目 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="project-filter">案件</Label>
                <Select value={projectFilter} onValueChange={setProjectFilter}>
                  <SelectTrigger id="project-filter">
                    <SelectValue placeholder="案件を選択" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">すべて</SelectItem>
                    {projects.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.projectName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="assignee-filter">担当者</Label>
                <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
                  <SelectTrigger id="assignee-filter">
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

              <div className="space-y-2">
                <Label htmlFor="department-filter">部署</Label>
                <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                  <SelectTrigger id="department-filter">
                    <SelectValue placeholder="部署を選択" />
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
          </div>
        </CardContent>
      </Card>

      {/* エラー表示 */}
      {isError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{isError.message || "エラーが発生しました"}</AlertDescription>
        </Alert>
      )}

      {/* 課題一覧 */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">ID</TableHead>
                <TableHead>課題</TableHead>
                <TableHead>案件</TableHead>
                <TableHead>ステータス</TableHead>
                <TableHead>優先度</TableHead>
                <TableHead>担当者</TableHead>
                <TableHead>期限</TableHead>
                <TableHead className="text-center">コメント</TableHead>
                <TableHead className="w-[100px]">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-full" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-8" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-8" /></TableCell>
                  </TableRow>
                ))
              ) : issues.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8">
                    該当する課題が見つかりませんでした
                  </TableCell>
                </TableRow>
              ) : (
                issues.map((issue) => {
                  const status = statusConfig[issue.status as keyof typeof statusConfig] || statusConfig.open
                  const priority = priorityConfig[issue.priority as keyof typeof priorityConfig] || priorityConfig.medium
                  const PriorityIcon = priority.icon

                  return (
                    <TableRow
                      key={issue.id}
                      className="cursor-pointer"
                      onDoubleClick={() => router.push(`/issues/${issue.id}`)}
                    >
                      <TableCell className="font-mono text-sm">
                        {issue.id.slice(0, 8)}
                      </TableCell>
                      <TableCell className="max-w-md">
                        <div>
                          <div className="font-medium line-clamp-1">
                            {issue.title}
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {issue.description && issue.description.length > 100
                              ? `${issue.description.substring(0, 100)}...`
                              : issue.description || "説明なし"}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{issue.project?.projectName}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <div className={`w-2 h-2 rounded-full ${status.color}`} />
                          <span className="text-sm">{status.label}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <PriorityIcon className={`h-4 w-4 ${priority.color}`} />
                          <span className="text-sm">{priority.label}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {issue.assignee && issue.assignee.lastName && issue.assignee.firstName ? (
                          <div className="flex items-center gap-2">
                            <Avatar className="h-6 w-6">
                              <AvatarFallback className="text-xs">
                                {issue.assignee.lastName.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-sm">{`${issue.assignee.lastName} ${issue.assignee.firstName}`}</span>
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">未割当</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {issue.dueDate ? (
                          <div className="flex items-center gap-1 text-sm">
                            <Calendar className="h-3 w-3" />
                            {new Date(issue.dueDate).toLocaleDateString()}
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <MessageSquare className="h-4 w-4" />
                          <span className="text-sm">{issue.commentsCount}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                              <Link href={`/issues/${issue.id}`}>
                                <Eye className="mr-2 h-4 w-4" />
                                詳細
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <Link href={`/issues/${issue.id}/edit`}>
                                <Edit className="mr-2 h-4 w-4" />
                                編集
                              </Link>
                            </DropdownMenuItem>
                            {session?.user?.isAdmin && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                  className="text-destructive"
                                  onClick={() => setDeleteIssueId(issue.id)}
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  削除
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* ページネーション */}
      <PaginationControls
        currentPage={currentPage}
        totalPages={pagination.totalPages}
        totalItems={pagination.total}
        onPreviousPage={goToPreviousPage}
        onNextPage={goToNextPage}
        hasPreviousPage={hasPreviousPage}
        hasNextPage={hasNextPage}
        loading={isLoading}
      />

      {/* 削除確認ダイアログ */}
      <Dialog open={!!deleteIssueId} onOpenChange={() => setDeleteIssueId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>課題の削除</DialogTitle>
            <DialogDescription>
              本当にこの課題を削除しますか？関連するコメントも含めて削除され、この操作は元に戻せません。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteIssueId(null)}
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