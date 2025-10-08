"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
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

interface User {
  id: string
  employeeNumber: string
  username: string
  email: string
  lastName: string
  firstName: string
  department: string | null
  departmentId: string | null
  departmentRef?: {
    id: string
    name: string
  } | null
  isAdmin: boolean
  status: string
  createdAt: string
  updatedAt: string
}

interface PaginationInfo {
  page: number
  limit: number
  total: number
  totalPages: number
}

export default function UsersPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [users, setUsers] = useState<User[]>([])
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [department, setDepartment] = useState("all")
  const [statusFilter, setStatusFilter] = useState("active")
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  // 管理者権限チェック
  useEffect(() => {
    if (status === "loading") return
    
    if (!session) {
      router.push("/login")
      return
    }
    
    if (!session.user?.isAdmin) {
      router.push("/dashboard")
      return
    }
  }, [session, status, router])

  // ユーザー一覧取得
  const fetchUsers = async () => {
    try {
      setLoading(true)
      setError("")
      
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      })
      
      if (searchQuery) params.append("search", searchQuery)
      if (department && department !== "all") params.append("department", department)
      if (statusFilter && statusFilter !== "all") params.append("status", statusFilter)

      const response = await fetch(`/api/users?${params}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "ユーザー一覧の取得に失敗しました")
      }

      setUsers(data.users)
      setPagination(data.pagination)
    } catch (error) {
      console.warn("Fetch users error:", error)
      setError(error instanceof Error ? error.message : "エラーが発生しました")
    } finally {
      setLoading(false)
    }
  }

  // 初回読み込み
  useEffect(() => {
    if (session?.user?.isAdmin) {
      fetchUsers()
    }
  }, [session])

  // フィルター変更時
  useEffect(() => {
    if (session?.user?.isAdmin) {
      setPagination(prev => ({ ...prev, page: 1 }))
      fetchUsers()
    }
  }, [searchQuery, department, statusFilter])

  // ユーザー削除
  const handleDelete = async () => {
    if (!deleteUserId) return

    try {
      setDeleteLoading(true)
      
      const response = await fetch(`/api/users/${deleteUserId}`, {
        method: "DELETE",
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || "ユーザーの削除に失敗しました")
      }
      
      toast.success("ユーザーを削除しました")
      setDeleteUserId(null)
      fetchUsers()
    } catch (error) {
      console.warn("Delete user error:", error)
      toast.error(error instanceof Error ? error.message : "削除に失敗しました")
    } finally {
      setDeleteLoading(false)
    }
  }

  if (status === "loading" || !session?.user?.isAdmin) {
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
          <h2 className="text-3xl font-bold tracking-tight">ユーザー管理</h2>
          <p className="text-muted-foreground">
            システムユーザーの管理（管理者権限が必要）
          </p>
        </div>
        <Button asChild>
          <Link href="/users/new">
            <Plus className="mr-2 h-4 w-4" />
            新規ユーザー
          </Link>
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
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
                  placeholder="社員番号、ユーザー名、メールアドレスで検索..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="状態" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">有効</SelectItem>
                <SelectItem value="inactive">無効</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* ユーザー一覧テーブル */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>社員番号</TableHead>
                <TableHead>氏名</TableHead>
                <TableHead>ユーザー名</TableHead>
                <TableHead>メールアドレス</TableHead>
                <TableHead>部署・チーム</TableHead>
                <TableHead>権限</TableHead>
                <TableHead>状態</TableHead>
                <TableHead>作成日時</TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 9 }).map((_, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8">
                    ユーザーが見つかりません
                  </TableCell>
                </TableRow>
              ) : (
                users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>{user.employeeNumber}</TableCell>
                    <TableCell>{user.lastName} {user.firstName}</TableCell>
                    <TableCell>{user.username}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{user.departmentRef?.name ||  "-"}</TableCell>
                    <TableCell>
                      <Badge variant={user.isAdmin ? "default" : "secondary"}>
                        {user.isAdmin ? "管理者" : "一般"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={user.status === "active" ? "default" : "secondary"}>
                        {user.status === "active" ? "有効" : "無効"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(user.createdAt).toLocaleDateString("ja-JP")}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          asChild
                        >
                          <Link href={`/users/${user.id}/edit`}>
                            <Edit className="h-4 w-4" />
                          </Link>
                        </Button>
                        {user.id !== session?.user.id && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setDeleteUserId(user.id)}
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
            onClick={() => {
              if (pagination.page > 1) {
                setPagination(prev => ({ ...prev, page: prev.page - 1 }))
                fetchUsers()
              }
            }}
            disabled={pagination.page <= 1 || loading}
          >
            前へ
          </Button>
          <span className="text-sm text-muted-foreground">
            {pagination.page} / {pagination.totalPages}ページ
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (pagination.page < pagination.totalPages) {
                setPagination(prev => ({ ...prev, page: prev.page + 1 }))
                fetchUsers()
              }
            }}
            disabled={pagination.page >= pagination.totalPages || loading}
          >
            次へ
          </Button>
        </div>
      )}

      {/* 削除確認ダイアログ */}
      <Dialog open={!!deleteUserId} onOpenChange={() => setDeleteUserId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>ユーザーの削除</DialogTitle>
            <DialogDescription>
              本当にこのユーザーを削除しますか？この操作は元に戻せません。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteUserId(null)}
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