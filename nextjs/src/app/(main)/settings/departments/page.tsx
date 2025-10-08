"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
  Users,
  Briefcase
} from "lucide-react"

interface Department {
  id: string
  name: string
  createdAt: string
  updatedAt: string
  _count?: {
    users: number
    projects: number
  }
}

interface PaginationInfo {
  page: number
  limit: number
  total: number
  totalPages: number
}

export default function DepartmentsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [departments, setDepartments] = useState<Department[]>([])
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 100,
    total: 0,
    totalPages: 0,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [deleteDepartmentId, setDeleteDepartmentId] = useState<string | null>(null)
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

  // 部署一覧取得
  const fetchDepartments = async () => {
    try {
      setLoading(true)
      setError("")

      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      })

      if (searchQuery) params.append("search", searchQuery)

      const response = await fetch(`/api/departments?${params}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "部署一覧の取得に失敗しました")
      }

      setDepartments(data.departments)
      setPagination(data.pagination)
    } catch (error) {
      console.warn("Fetch departments error:", error)
      setError(error instanceof Error ? error.message : "エラーが発生しました")
    } finally {
      setLoading(false)
    }
  }

  // 初回読み込み
  useEffect(() => {
    if (session?.user?.isAdmin) {
      fetchDepartments()
    }
  }, [session])

  // フィルター変更時
  useEffect(() => {
    if (session?.user?.isAdmin) {
      setPagination(prev => ({ ...prev, page: 1 }))
      fetchDepartments()
    }
  }, [searchQuery])

  // 部署削除
  const handleDelete = async () => {
    if (!deleteDepartmentId) return

    try {
      setDeleteLoading(true)

      const response = await fetch(`/api/departments/${deleteDepartmentId}`, {
        method: "DELETE",
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "部署の削除に失敗しました")
      }

      toast.success("部署を削除しました")
      setDeleteDepartmentId(null)
      fetchDepartments()
    } catch (error) {
      console.warn("Delete department error:", error)
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
          <h2 className="text-3xl font-bold tracking-tight">部署・チーム管理</h2>
          <p className="text-muted-foreground">
            部署・チームの登録・管理（管理者権限が必要）
          </p>
        </div>
        <Button asChild>
          <Link href="/settings/departments/new">
            <Plus className="mr-2 h-4 w-4" />
            新規部署・チーム
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
                  placeholder="部署・チーム名で検索..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 部署一覧テーブル */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>部署・チーム名</TableHead>
                <TableHead>所属ユーザー数</TableHead>
                <TableHead>関連案件数</TableHead>
                <TableHead>作成日時</TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 5 }).map((_, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : departments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    部署・チームが見つかりません
                  </TableCell>
                </TableRow>
              ) : (
                departments.map((department) => (
                  <TableRow key={department.id}>
                    <TableCell className="font-medium">{department.name}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {department._count?.users || 0}人
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Briefcase className="h-3 w-3" />
                        {department._count?.projects || 0}件
                      </div>
                    </TableCell>
                    <TableCell>
                      {new Date(department.createdAt).toLocaleDateString("ja-JP")}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          asChild
                        >
                          <Link href={`/settings/departments/${department.id}/edit`}>
                            <Edit className="h-4 w-4" />
                          </Link>
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setDeleteDepartmentId(department.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
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
                fetchDepartments()
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
                fetchDepartments()
              }
            }}
            disabled={pagination.page >= pagination.totalPages || loading}
          >
            次へ
          </Button>
        </div>
      )}

      {/* 削除確認ダイアログ */}
      <Dialog open={!!deleteDepartmentId} onOpenChange={() => setDeleteDepartmentId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>部署・チームの削除</DialogTitle>
            <DialogDescription>
              本当にこの部署・チームを削除しますか？この操作は元に戻せません。
              <br />
              ※ 所属ユーザーまたは関連案件が存在する場合は削除できません。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDepartmentId(null)}
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
