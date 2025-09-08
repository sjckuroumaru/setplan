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
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import {
  Plus,
  Search,
  MoreHorizontal,
  Building2,
  Edit,
  Trash,
  Phone,
  MapPin,
} from "lucide-react"

interface Customer {
  id: string
  name: string
  postalCode: string | null
  address: string | null
  building: string | null
  representative: string | null
  phone: string | null
  fax: string | null
  remarks: string | null
  status: string
  createdAt: string
  updatedAt: string
}

export default function CustomersPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  // 顧客一覧取得
  const fetchCustomers = async () => {
    try {
      setIsLoading(true)
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: "20",
      })
      
      if (searchTerm) {
        params.append("search", searchTerm)
      }

      const response = await fetch(`/api/customers?${params}`)
      
      if (response.ok) {
        const data = await response.json()
        setCustomers(data.customers)
        setTotalPages(data.totalPages)
      } else if (response.status !== 401) {
        // 401以外のエラーの場合のみエラーメッセージを表示
        console.error("Failed to fetch customers")
      }
    } catch (error) {
      console.error("Failed to fetch customers:", error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (session) {
      fetchCustomers()
    }
  }, [session, currentPage, searchTerm])

  // 顧客削除
  const handleDelete = async (id: string) => {
    if (!confirm("この顧客を削除してもよろしいですか？")) return

    try {
      const response = await fetch(`/api/customers/${id}`, {
        method: "DELETE",
      })

      if (!response.ok) throw new Error()
      
      toast.success("顧客を削除しました")
      fetchCustomers()
    } catch (error) {
      toast.error("削除に失敗しました")
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

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>顧客一覧</CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="顧客名で検索"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {customers.length === 0 ? (
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
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>会社名</TableHead>
                  <TableHead>代表者</TableHead>
                  <TableHead>電話番号</TableHead>
                  <TableHead>住所</TableHead>
                  <TableHead>ステータス</TableHead>
                  <TableHead className="w-[80px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customers.map((customer) => (
                  <TableRow key={customer.id}>
                    <TableCell className="font-medium">
                      {customer.name}
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
                      <Badge variant={customer.status === "active" ? "default" : "secondary"}>
                        {customer.status === "active" ? "有効" : "無効"}
                      </Badge>
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
                            onClick={() => router.push(`/customers/${customer.id}/edit`)}
                          >
                            <Edit className="mr-2 h-4 w-4" />
                            編集
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDelete(customer.id)}
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