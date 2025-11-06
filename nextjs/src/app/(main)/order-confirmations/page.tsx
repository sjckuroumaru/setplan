"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useOrderConfirmations } from "@/hooks/use-order-confirmations"
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
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, Plus, MoreHorizontal, Eye, Pencil, Copy, Download, Trash, FileText, Send, CheckCircle, XCircle, Clock } from "lucide-react"
import { toast } from "sonner"
import { useSession } from "next-auth/react"
import { format } from "date-fns"
import { ja } from "date-fns/locale"

type OrderConfirmation = {
  id: string
  confirmationNumber: string
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

export default function OrderConfirmationsPage() {
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
  const { orderConfirmations, isLoading, isError, mutate } = useOrderConfirmations()

  const handleDownloadPDF = async (confirmation: OrderConfirmation) => {
    const { downloadPDF } = await import("@/lib/pdf-utils")
    await downloadPDF(
      `/api/order-confirmations/${confirmation.id}/pdf`,
      `${confirmation.confirmationNumber}.pdf`
    )
  }

  const handleDuplicate = async (id: string) => {
    try {
      const response = await fetch(`/api/order-confirmations/${id}/duplicate`, {
        method: "POST",
      })
      if (!response.ok) throw new Error()

      const duplicated = await response.json()
      router.push(`/order-confirmations/${duplicated.id}/edit`)

      toast.success("発注請書を複製しました")
    } catch {
      toast.error("発注請書の複製に失敗しました")
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("この発注請書を削除してもよろしいですか？")) return

    try {
      const response = await fetch(`/api/order-confirmations/${id}`, {
        method: "DELETE",
      })
      if (!response.ok) throw new Error()

      toast.success("発注請書を削除しました")
      mutate() // SWRでデータ再取得
    } catch {
      toast.error("発注請書の削除に失敗しました")
    }
  }

  const handleStatusUpdate = async (id: string, status: string) => {
    try {
      const response = await fetch(`/api/order-confirmations/${id}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      })
      if (!response.ok) throw new Error()

      toast.success("ステータスを更新しました")
      mutate() // SWRでデータ再取得
    } catch {
      toast.error("ステータスの更新に失敗しました")
    }
  }

  const canEdit = (confirmation: OrderConfirmation) => {
    if (!session?.user) return false
    return session.user.isAdmin || confirmation.user.id === session.user.id
  }

  const canDelete = (confirmation: OrderConfirmation) => {
    if (!session?.user) return false
    return (session.user.isAdmin || confirmation.user.id === session.user.id) && confirmation.status === "draft"
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
          <CardTitle>発注請書管理</CardTitle>
          <Button asChild>
            <Link href="/order-confirmations/new">
              <Plus className="mr-2 h-4 w-4" />
              新規作成
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>発注請書番号</TableHead>
                <TableHead>発注先</TableHead>
                <TableHead>件名</TableHead>
                <TableHead>発行日</TableHead>
                <TableHead>納期</TableHead>
                <TableHead>金額</TableHead>
                <TableHead>ステータス</TableHead>
                <TableHead>担当者</TableHead>
                <TableHead>操作</TableHead>
                <TableHead>変更</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orderConfirmations.map((confirmation) => (
                <TableRow key={confirmation.id}>
                  <TableCell>
                    <Link
                      href={`/order-confirmations/${confirmation.id}`}
                      className="text-blue-600 hover:text-blue-800 hover:underline"
                    >
                      {confirmation.confirmationNumber}
                    </Link>
                  </TableCell>
                  <TableCell>{confirmation.supplier.name}</TableCell>
                  <TableCell>{confirmation.subject}</TableCell>
                  <TableCell>
                    {format(new Date(confirmation.issueDate), "yyyy/MM/dd", { locale: ja })}
                  </TableCell>
                  <TableCell>
                    {confirmation.deliveryDate
                      ? format(new Date(confirmation.deliveryDate), "yyyy/MM/dd", { locale: ja })
                      : "-"}
                  </TableCell>
                  <TableCell>¥{confirmation.totalAmount.toLocaleString()}</TableCell>
                  <TableCell>
                    <Badge variant={statusColors[confirmation.status]}>
                      {statusLabels[confirmation.status]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {confirmation.user.lastName} {confirmation.user.firstName}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>操作</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild>
                          <Link href={`/order-confirmations/${confirmation.id}`}>
                            <Eye className="mr-2 h-4 w-4" />
                            詳細
                          </Link>
                        </DropdownMenuItem>
                        {canEdit(confirmation) && (
                          <DropdownMenuItem asChild>
                            <Link href={`/order-confirmations/${confirmation.id}/edit`}>
                              <Pencil className="mr-2 h-4 w-4" />
                              編集
                            </Link>
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={() => handleDownloadPDF(confirmation)}>
                          <Download className="mr-2 h-4 w-4" />
                          PDFダウンロード
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDuplicate(confirmation.id)}>
                          <Copy className="mr-2 h-4 w-4" />
                          複製
                        </DropdownMenuItem>
                        {canDelete(confirmation) && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => handleDelete(confirmation.id)}
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
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>ステータス変更</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => handleStatusUpdate(confirmation.id, "draft")}
                          disabled={confirmation.status === "draft"}
                        >
                          <FileText className="mr-2 h-4 w-4" />
                          下書き
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleStatusUpdate(confirmation.id, "sent")}
                          disabled={confirmation.status === "sent"}
                        >
                          <Send className="mr-2 h-4 w-4" />
                          送付済
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleStatusUpdate(confirmation.id, "approved")}
                          disabled={confirmation.status === "approved"}
                        >
                          <CheckCircle className="mr-2 h-4 w-4" />
                          承認済
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleStatusUpdate(confirmation.id, "rejected")}
                          disabled={confirmation.status === "rejected"}
                        >
                          <XCircle className="mr-2 h-4 w-4" />
                          却下
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleStatusUpdate(confirmation.id, "closed")}
                          disabled={confirmation.status === "closed"}
                        >
                          <Clock className="mr-2 h-4 w-4" />
                          完了
                        </DropdownMenuItem>
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
