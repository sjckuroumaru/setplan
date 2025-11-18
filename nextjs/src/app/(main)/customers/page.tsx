"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useCustomers } from "@/hooks/use-customers"
import { usePagination } from "@/hooks/use-pagination"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  CompactTable,
  CompactTableRow,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
} from "@/components/ui/compact-table"
import { DeleteButton } from "@/components/ui/action-buttons"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import {
  Plus,
  Search,
  Building2,
  Phone,
  MapPin,
} from "lucide-react"

export default function CustomersPage() {
  const { data: session } = useSession()
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
  } = usePagination({ defaultLimit: 20 })
  const [searchTerm, setSearchTerm] = useState("")

  // SWRフックでデータ取得
  const { customers, pagination: swrPagination, isLoading, mutate } = useCustomers({
    page: currentPage,
    limit: pagination.limit,
    searchQuery: searchTerm || undefined,
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

  // 検索時はページを1に戻す
  useEffect(() => {
    if (session) {
      resetToFirstPage()
    }
  }, [searchTerm, resetToFirstPage, session])

  // 顧客削除
  const handleDelete = async (id: string) => {
    if (!confirm("この顧客を削除してもよろしいですか？")) return

    try {
      const response = await fetch(`/api/customers/${id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "削除に失敗しました")
      }

      toast.success("顧客を削除しました")
      mutate() // SWRでデータ再取得
    } catch (error: any) {
      toast.error(error.message || "削除に失敗しました")
    }
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
          <h2 className="text-3xl font-bold tracking-tight">顧客管理</h2>
          <p className="text-muted-foreground">
            見積書の宛先となる顧客情報を管理します
          </p>
        </div>
        <Button onClick={() => router.push("/customers/new")}>
          <Plus className="mr-2 h-4 w-4" />
          新規顧客
        </Button>
      </div>

      {/* フィルター */}
      <Card>
        <CardHeader>
          <CardTitle>フィルター</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="search">検索</Label>
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="search"
                placeholder="顧客名で検索..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 顧客一覧 */}
      <Card>
        {customers.length === 0 ? (
          <CardContent>
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold">顧客が登録されていません</h3>
              <p className="text-sm text-muted-foreground mt-2">
                新規顧客を登録して管理を始めましょう
              </p>
              <Button
                onClick={() => router.push("/customers/new")}
                variant="outline"
                className="mt-4"
              >
                <Plus className="mr-2 h-4 w-4" />
                最初の顧客を登録
              </Button>
            </div>
          </CardContent>
        ) : (
          <CardContent className="p-0">
            <CompactTable>
              <TableHeader>
                <CompactTableRow>
                  <TableHead className="min-w-[150px]">会社名</TableHead>
                  <TableHead>代表者</TableHead>
                  <TableHead>電話番号</TableHead>
                  <TableHead>住所</TableHead>
                  <TableHead>ステータス</TableHead>
                  <TableHead className="text-center">操作</TableHead>
                </CompactTableRow>
              </TableHeader>
              <TableBody>
                {customers.map((customer) => (
                  <CompactTableRow key={customer.id}>
                    <TableCell className="font-medium">
                      <Link href={`/customers/${customer.id}/edit`} className="text-blue-600 hover:text-blue-800 hover:underline">
                        {customer.name}
                      </Link>
                    </TableCell>
                    <TableCell>{customer.representative || "-"}</TableCell>
                    <TableCell>
                      {customer.phone ? (
                        <div className="flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {customer.phone}
                        </div>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell>
                      {customer.address ? (
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          <span className="truncate max-w-[200px]">
                            {customer.address}
                          </span>
                        </div>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={customer.status === "active" ? "default" : "secondary"} className="text-xs">
                        {customer.status === "active" ? "有効" : "無効"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-center gap-2">
                        <DeleteButton onClick={() => handleDelete(customer.id)} />
                      </div>
                    </TableCell>
                  </CompactTableRow>
                ))}
              </TableBody>
            </CompactTable>
          </CardContent>
        )}
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
            {currentPage} / {pagination.totalPages}
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
    </div>
  )
}