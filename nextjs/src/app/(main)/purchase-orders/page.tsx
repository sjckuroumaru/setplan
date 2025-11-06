"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { usePurchaseOrders } from "@/hooks/use-purchase-orders"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, Plus, MoreHorizontal, Eye, Pencil, Copy, Download, Trash } from "lucide-react"
import { toast } from "sonner"
import { useSession } from "next-auth/react"
import { format } from "date-fns"
import { ja } from "date-fns/locale"

type PurchaseOrder = {
  id: string
  orderNumber: string
  subject: string
  supplierId: string
  supplier: {
    id: string
    name: string
  }
  issueDate: string
  deliveryDate: string | null
  totalAmount: number
  status: string
  user: {
    id: string
    lastName: string
    firstName: string
  }
}

const statusColors: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  draft: "secondary",
  sent: "default",
  approved: "default",
  rejected: "destructive",
  closed: "outline",
}

const statusLabels: Record<string, string> = {
  draft: "下書き",
  sent: "送付済",
  approved: "承認済",
  rejected: "却下",
  closed: "完了",
}

export default function PurchaseOrdersPage() {
  const router = useRouter()
  const { data: session, status } = useSession()

  // 認証チェック
  useEffect(() => {
    if (status === "loading") return
    if (!session) {
      router.push("/login")
      return
    }
  }, [session, status, router])

  // SWRフックでデータ取得
  const { purchaseOrders, isLoading, isError, mutate } = usePurchaseOrders()

  const handleDownloadPDF = async (order: PurchaseOrder) => {
    const { downloadPDF } = await import("@/lib/pdf-utils")
    await downloadPDF(
      `/api/purchase-orders/${order.id}/pdf`,
      `${order.orderNumber}.pdf`
    )
  }

  const handleDuplicate = async (id: string) => {
    try {
      const response = await fetch(`/api/purchase-orders/${id}/duplicate`, {
        method: "POST",
      })
      if (!response.ok) throw new Error()
      
      const duplicated = await response.json()
      router.push(`/purchase-orders/${duplicated.id}/edit`)

      toast.success("発注書を複製しました")
    } catch {
      toast.error("発注書の複製に失敗しました")
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("この発注書を削除してもよろしいですか？")) return

    try {
      const response = await fetch(`/api/purchase-orders/${id}`, {
        method: "DELETE",
      })
      if (!response.ok) throw new Error()

      toast.success("発注書を削除しました")
      mutate() // SWRでデータ再取得
    } catch {
      toast.error("発注書の削除に失敗しました")
    }
  }

  const canEdit = (order: PurchaseOrder) => {
    if (!session?.user) return false
    return session.user.isAdmin || order.user.id === session.user.id
  }

  const canDelete = (order: PurchaseOrder) => {
    if (!session?.user) return false
    return (session.user.isAdmin || order.user.id === session.user.id) && order.status === "draft"
  }

  if (status === "loading" || isLoading || !session) {
    return (
      <div className="flex justify-center items-center h-96">
        <Loader2 className="animate-spin h-8 w-8" />
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>発注書管理</CardTitle>
          <Button asChild>
            <Link href="/purchase-orders/new">
              <Plus className="mr-2 h-4 w-4" />
              新規作成
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>発注書番号</TableHead>
                <TableHead>発注先</TableHead>
                <TableHead>件名</TableHead>
                <TableHead>発行日</TableHead>
                <TableHead>納期</TableHead>
                <TableHead>金額</TableHead>
                <TableHead>ステータス</TableHead>
                <TableHead>担当者</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {purchaseOrders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell>
                    <Link
                      href={`/purchase-orders/${order.id}`}
                      className="text-blue-600 hover:text-blue-800 hover:underline"
                    >
                      {order.orderNumber}
                    </Link>
                  </TableCell>
                  <TableCell>{order.supplier.name}</TableCell>
                  <TableCell>{order.subject}</TableCell>
                  <TableCell>
                    {format(new Date(order.issueDate), "yyyy/MM/dd", { locale: ja })}
                  </TableCell>
                  <TableCell>
                    {order.deliveryDate
                      ? format(new Date(order.deliveryDate), "yyyy/MM/dd", { locale: ja })
                      : "-"}
                  </TableCell>
                  <TableCell>¥{order.totalAmount.toLocaleString()}</TableCell>
                  <TableCell>
                    <Badge variant={statusColors[order.status]}>
                      {statusLabels[order.status]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {order.user.lastName} {order.user.firstName}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={`/purchase-orders/${order.id}`}>
                            <Eye className="mr-2 h-4 w-4" />
                            詳細
                          </Link>
                        </DropdownMenuItem>
                        {canEdit(order) && (
                          <DropdownMenuItem asChild>
                            <Link href={`/purchase-orders/${order.id}/edit`}>
                              <Pencil className="mr-2 h-4 w-4" />
                              編集
                            </Link>
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={() => handleDownloadPDF(order)}>
                          <Download className="mr-2 h-4 w-4" />
                          PDFダウンロード
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDuplicate(order.id)}>
                          <Copy className="mr-2 h-4 w-4" />
                          複製
                        </DropdownMenuItem>
                        {canDelete(order) && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => handleDelete(order.id)}
                              className="text-destructive"
                            >
                              <Trash className="mr-2 h-4 w-4" />
                              削除
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}