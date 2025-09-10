"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { usePagination } from "@/hooks/use-pagination"
import { PaginationControls } from "@/components/ui/pagination-controls"
import { config } from "@/lib/config"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
  Filter,
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

// 型定義
interface User {
  id: string
  name: string
  employeeNumber: string
}

interface Project {
  id: string
  projectNumber: string
  projectName: string
}

interface Issue {
  id: string
  title: string
  description: string
  status: string
  priority: string
  category?: string
  project: Project
  reporter: User | null
  assignee: User | null
  dueDate: string | null
  createdAt: string
  updatedAt: string
  resolvedAt: string | null
  commentsCount: number
}

interface Stats {
  total: number
  open: number
  inProgress: number
  resolved: number
  closed: number
  highPriority: number
}

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
  const [issues, setIssues] = useState<Issue[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [stats, setStats] = useState<Stats>({ total: 0, open: 0, inProgress: 0, resolved: 0, closed: 0, highPriority: 0 })
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
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [priorityFilter, setPriorityFilter] = useState("all")
  const [projectFilter, setProjectFilter] = useState("all")
  const [assigneeFilter, setAssigneeFilter] = useState("all")
  const [deleteIssueId, setDeleteIssueId] = useState<string | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  // 認証チェック
  useEffect(() => {
    if (status === "loading") return
    
    if (!session) {
      router.push("/login")
      return
    }
  }, [session, status, router])

  // データ取得
  const fetchIssues = async (pageNumber: number) => {
    try {
      setLoading(true)
      setError("")
      
      const params = new URLSearchParams()
      
      params.append("page", pageNumber.toString())
      params.append("limit", pagination.limit.toString())
      
      if (searchQuery) params.append("search", searchQuery)
      if (statusFilter !== "all") params.append("status", statusFilter)
      if (priorityFilter !== "all") params.append("priority", priorityFilter)
      if (projectFilter !== "all") params.append("projectId", projectFilter)
      if (assigneeFilter !== "all") params.append("assigneeId", assigneeFilter)
      
      const response = await fetch(`/api/issues?${params}`)
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || "課題一覧の取得に失敗しました")
      }
      
      setIssues(data.issues)
      setStats(data.stats)
      setPagination(data.pagination)
    } catch (error) {
      console.warn("Fetch issues warning:", error)
      setError(error instanceof Error ? error.message : "エラーが発生しました")
    } finally {
      setLoading(false)
    }
  }

  // プロジェクト一覧取得
  const fetchProjects = async () => {
    try {
      const response = await fetch("/api/projects")
      const data = await response.json()
      if (response.ok) {
        setProjects(data.projects || [])
      }
    } catch (error) {
      console.warn("Failed to fetch projects:", error)
    }
  }

  // ユーザー一覧取得
  const fetchUsers = async () => {
    try {
      const response = await fetch("/api/users?basic=true&limit=1000&status=active")
      const data = await response.json()
      if (response.ok) {
        setUsers(data.users.map((user: any) => ({
          id: user.id,
          name: `${user.lastName} ${user.firstName}`,
          employeeNumber: user.employeeNumber,
        })))
      }
    } catch (error) {
      console.warn("Failed to fetch users:", error)
    }
  }

  // 初期ロード
  useEffect(() => {
    if (session) {
      fetchProjects()
      fetchUsers()
    }
  }, [session])

  // フィルター変更時にページを1に戻す
  useEffect(() => {
    if (session) {
      resetToFirstPage()
    }
  }, [searchQuery, statusFilter, priorityFilter, projectFilter, assigneeFilter, resetToFirstPage])

  // データ取得
  useEffect(() => {
    if (session) {
      fetchIssues(currentPage)
    }
  }, [session, currentPage, searchQuery, statusFilter, priorityFilter, projectFilter, assigneeFilter])

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
      fetchIssues(currentPage)
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
            プロジェクトの課題を追跡・管理
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
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">全課題</CardTitle>
            <Flag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">
              登録済み課題
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">未対応</CardTitle>
            <CircleDot className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.open}</div>
            <p className="text-xs text-muted-foreground">
              新規課題
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">対応中</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.inProgress}</div>
            <p className="text-xs text-muted-foreground">
              作業中
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">解決済</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.resolved}</div>
            <p className="text-xs text-muted-foreground">
              完了待ち
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">高優先度</CardTitle>
            <ArrowUpCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.highPriority}</div>
            <p className="text-xs text-muted-foreground">
              要対応
            </p>
          </CardContent>
        </Card>
      </div>

      {/* フィルター */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">フィルター:</span>
            </div>
            
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="課題を検索..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[130px]">
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

            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="優先度" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">すべて</SelectItem>
                <SelectItem value="high">高</SelectItem>
                <SelectItem value="medium">中</SelectItem>
                <SelectItem value="low">低</SelectItem>
              </SelectContent>
            </Select>

            <Select value={projectFilter} onValueChange={setProjectFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="プロジェクト" />
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

            <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="担当者" />
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
        </CardContent>
      </Card>

      {/* エラー表示 */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
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
                <TableHead>プロジェクト</TableHead>
                <TableHead>ステータス</TableHead>
                <TableHead>優先度</TableHead>
                <TableHead>担当者</TableHead>
                <TableHead>期限</TableHead>
                <TableHead className="text-center">コメント</TableHead>
                <TableHead className="w-[100px]">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
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
                  const StatusIcon = status.icon
                  const PriorityIcon = priority.icon
                  
                  return (
                    <TableRow key={issue.id}>
                      <TableCell className="font-mono text-sm">
                        <Link 
                          href={`/issues/${issue.id}`}
                          className="hover:underline text-blue-600"
                        >
                          {issue.id.slice(0, 8)}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <div>
                          <Link 
                            href={`/issues/${issue.id}`}
                            className="font-medium hover:underline"
                          >
                            {issue.title}
                          </Link>
                          <p className="text-sm text-muted-foreground line-clamp-1">
                            {issue.description}
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
                        {issue.assignee ? (
                          <div className="flex items-center gap-2">
                            <Avatar className="h-6 w-6">
                              <AvatarFallback className="text-xs">
                                {issue.assignee.name.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-sm">{issue.assignee.name}</span>
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
        loading={loading}
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