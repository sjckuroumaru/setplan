"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useUsers } from "@/hooks/use-users"
import { usePagination } from "@/hooks/use-pagination"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  CompactTable,
  CompactTableRow,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
} from "@/components/ui/compact-table"
import { DeleteButton } from "@/components/ui/action-buttons"
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
  AlertCircle
} from "lucide-react"

export default function UsersPage() {
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
  const [searchQuery, setSearchQuery] = useState("")
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

  // SWRフックでデータ取得
  const { users, pagination: swrPagination, isLoading, isError, mutate } = useUsers({
    page: currentPage,
    limit: pagination.limit,
    searchQuery: searchQuery || undefined,
    status: statusFilter !== "all" ? statusFilter : undefined,
  })

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

  // 検索・フィルター変更時はページを1に戻す
  useEffect(() => {
    if (session?.user?.isAdmin) {
      resetToFirstPage()
    }
  }, [searchQuery, statusFilter, resetToFirstPage, session?.user?.isAdmin])

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
      mutate()
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
          <CompactTable>
            <TableHeader>
              <CompactTableRow>
                <TableHead>社員番号</TableHead>
                <TableHead>氏名</TableHead>
                <TableHead>ユーザー名</TableHead>
                <TableHead>メールアドレス</TableHead>
                <TableHead>部署・チーム</TableHead>
                <TableHead>権限</TableHead>
                <TableHead>状態</TableHead>
                <TableHead>作成日時</TableHead>
                <TableHead className="text-center">操作</TableHead>
              </CompactTableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <CompactTableRow key={i}>
                    {Array.from({ length: 9 }).map((_, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    ))}
                  </CompactTableRow>
                ))
              ) : users.length === 0 ? (
                <CompactTableRow>
                  <TableCell colSpan={9} className="text-center py-8">
                    ユーザーが見つかりません
                  </TableCell>
                </CompactTableRow>
              ) : (
                users.map((user) => (
                  <CompactTableRow key={user.id}>
                    <TableCell>
                      <Link href={`/users/${user.id}/edit`} className="text-blue-600 hover:text-blue-800 hover:underline">
                        {user.employeeNumber}
                      </Link>
                    </TableCell>
                    <TableCell>{user.lastName} {user.firstName}</TableCell>
                    <TableCell>{user.username}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{user.departmentRef?.name ||  "-"}</TableCell>
                    <TableCell>
                      <Badge variant={user.isAdmin ? "default" : "secondary"} className="text-xs">
                        {user.isAdmin ? "管理者" : "一般"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={user.status === "active" ? "default" : "secondary"} className="text-xs">
                        {user.status === "active" ? "有効" : "無効"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(user.createdAt).toLocaleDateString("ja-JP")}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-center gap-2">
                        {user.id !== session?.user.id && (
                          <DeleteButton onClick={() => setDeleteUserId(user.id)} />
                        )}
                      </div>
                    </TableCell>
                  </CompactTableRow>
                ))
              )}
            </TableBody>
          </CompactTable>
        </CardContent>
      </Card>

      {/* ページネーション */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={goToPreviousPage}
            disabled={!hasPreviousPage}
          >
            前へ
          </Button>
          <span className="text-sm text-muted-foreground">
            {currentPage} / {pagination.totalPages}ページ
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={goToNextPage}
            disabled={!hasNextPage}
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