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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "sonner"
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2,
  Calendar,
  BarChart3,
  FileText,
  Clock,
  AlertCircle
} from "lucide-react"

interface Project {
  id: string
  projectNumber: string
  projectName: string
  departmentId: string | null
  departmentRef?: {
    id: string
    name: string
  } | null
}

interface ScheduleItem {
  id: string
  projectId: string | null
  content: string
  details: string | null
  project?: Project
}

type SchedulePlan = ScheduleItem

interface ScheduleActual extends ScheduleItem {
  hours: number
}

interface Schedule {
  id: string
  userId: string
  scheduleDate: string
  checkInTime: string | null
  checkOutTime: string | null
  reflection: string | null
  status: string
  createdAt: string
  updatedAt: string
  user: {
    id: string
    lastName: string
    firstName: string
    employeeNumber: string
  }
  plans: SchedulePlan[]
  actuals: ScheduleActual[]
}

const statusLabels = {
  planned: "予定",
  in_progress: "進行中", 
  completed: "完了",
}

const statusVariants = {
  planned: "outline" as const,
  in_progress: "default" as const,
  completed: "secondary" as const,
}

export default function SchedulesPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [schedules, setSchedules] = useState<Schedule[]>([])
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
  const [userFilter, setUserFilter] = useState("all")
  const [departmentFilter, setDepartmentFilter] = useState("all")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [deleteScheduleId, setDeleteScheduleId] = useState<string | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [users, setUsers] = useState<{ id: string; name: string }[]>([])
  const [departments, setDepartments] = useState<{ id: string; name: string }[]>([])
  const [userFilterInitialized, setUserFilterInitialized] = useState(false)
  const [departmentFilterInitialized, setDepartmentFilterInitialized] = useState(false)

  // 認証チェック
  useEffect(() => {
    if (status === "loading") return

    if (!session) {
      router.push("/login")
      return
    }
  }, [session, status, router])

  // 初期ユーザーフィルター適用（一般ユーザーのみ）
  useEffect(() => {
    if (session && !userFilterInitialized && users.length > 0 && !session.user.isAdmin) {
      setUserFilter(session.user.id)
      setUserFilterInitialized(true)
    }
  }, [session, userFilterInitialized, users.length])

  // 初期部署フィルター適用（全ユーザー）
  useEffect(() => {
    if (session && !departmentFilterInitialized && departments.length > 0 && session.user.departmentId) {
      setDepartmentFilter(session.user.departmentId)
      setDepartmentFilterInitialized(true)
    }
  }, [session, departmentFilterInitialized, departments.length])

  // ユーザー一覧取得（全ユーザーが使用可能）
  const fetchUsers = async () => {
    try {
      const response = await fetch("/api/users?basic=true")
      const data = await response.json()
      if (response.ok) {
        setUsers(data.users.map((user: any) => ({
          id: user.id,
          name: `${user.lastName} ${user.firstName}`
        })))
      }
    } catch (error) {
      console.warn("Failed to fetch users:", error)
    }
  }

  // 部署一覧取得
  const fetchDepartments = async () => {
    try {
      const response = await fetch("/api/departments?basic=true&limit=1000")
      const data = await response.json()
      if (response.ok) {
        setDepartments(data.departments || [])
      }
    } catch (error) {
      console.warn("Failed to fetch departments:", error)
    }
  }

  // 予定実績一覧取得
  const fetchSchedules = async (pageNumber: number) => {
    try {
      setLoading(true)
      setError("")
      
      const params = new URLSearchParams({
        page: pageNumber.toString(),
        limit: pagination.limit.toString(),
      })
      
      if (searchQuery) params.append("search", searchQuery)
      if (userFilter && userFilter !== "all") {
        params.append("userId", userFilter)
      }
      if (departmentFilter && departmentFilter !== "all") {
        params.append("departmentId", departmentFilter)
      }
      if (startDate) params.append("startDate", startDate)
      if (endDate) params.append("endDate", endDate)

      const response = await fetch(`/api/schedules?${params}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "予定実績一覧の取得に失敗しました")
      }

      setSchedules(data.schedules)
      setPagination(data.pagination)
    } catch (error) {
      console.warn("Fetch schedules error:", error)
      setError(error instanceof Error ? error.message : "エラーが発生しました")
    } finally {
      setLoading(false)
    }
  }

  // 初回読み込み
  useEffect(() => {
    if (session) {
      fetchUsers()
      fetchDepartments()
    }
  }, [session])

  // フィルター変更時はページを1に戻す
  useEffect(() => {
    if (session) {
      resetToFirstPage()
    }
  }, [searchQuery, userFilter, departmentFilter, startDate, endDate, resetToFirstPage])

  // データ取得
  useEffect(() => {
    if (session) {
      fetchSchedules(currentPage)
    }
  }, [session, currentPage, searchQuery, userFilter, departmentFilter, startDate, endDate])

  // 予定実績削除
  const handleDelete = async () => {
    if (!deleteScheduleId) return

    try {
      setDeleteLoading(true)
      
      const response = await fetch(`/api/schedules/${deleteScheduleId}`, {
        method: "DELETE",
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || "予定実績の削除に失敗しました")
      }
      
      toast.success("予定実績を削除しました")
      setDeleteScheduleId(null)
      fetchSchedules(currentPage)
    } catch (error) {
      console.warn("Delete schedule error:", error)
      toast.error(error instanceof Error ? error.message : "削除に失敗しました")
    } finally {
      setDeleteLoading(false)
    }
  }

  // 日付フォーマット
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("ja-JP")
  }

  // 実績時間合計計算
  const getTotalHours = (actuals: ScheduleActual[]) => {
    return actuals.reduce((sum, actual) => sum + actual.hours, 0)
  }

  // 編集・削除権限チェック
  const canEditOrDelete = (schedule: Schedule) => {
    if (!session) return false
    // 管理者または作成者本人のみ操作可能
    return session.user.isAdmin || schedule.userId === session.user.id
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
          <h2 className="text-3xl font-bold tracking-tight">予定実績管理</h2>
          <p className="text-muted-foreground">
            日々の予定と実績を管理
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/schedules/calendar">
              <Calendar className="mr-2 h-4 w-4" />
              カレンダー
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/schedules/chart">
              <BarChart3 className="mr-2 h-4 w-4" />
              グラフ
            </Link>
          </Button>
          <Button asChild>
            <Link href="/schedules/new">
              <Plus className="mr-2 h-4 w-4" />
              新規登録
            </Link>
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="list" className="space-y-4">
        <TabsList>
          <TabsTrigger value="list">
            <FileText className="mr-2 h-4 w-4" />
            一覧表示
          </TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-4">
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
                        placeholder="検索..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="user-filter">ユーザー</Label>
                    <Select key={`user-${userFilter}`} value={userFilter} onValueChange={setUserFilter}>
                      <SelectTrigger id="user-filter">
                        <SelectValue placeholder="ユーザーを選択" />
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
                    <Label htmlFor="department-filter">部署・チーム</Label>
                    <Select key={`dept-${departmentFilter}`} value={departmentFilter} onValueChange={setDepartmentFilter}>
                      <SelectTrigger id="department-filter">
                        <SelectValue placeholder="部署・チームを選択" />
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

                {/* 2行目 */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                  <div className="space-y-2">
                    <Label htmlFor="start-date">開始日</Label>
                    <Input
                      id="start-date"
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="end-date">終了日</Label>
                    <Input
                      id="end-date"
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                    />
                  </div>

                  <div className="md:col-span-2">
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => {
                        setSearchQuery("")
                        setStartDate("")
                        setEndDate("")
                        // 初期フィルター状態に戻す
                        if (session?.user.isAdmin) {
                          // 管理者: 自身の部署のみ
                          setDepartmentFilter(session.user.departmentId || "all")
                          setUserFilter("all")
                        } else {
                          // 一般ユーザー: 自身の部署 + 自身のユーザーID
                          setDepartmentFilter(session?.user.departmentId || "all")
                          setUserFilter(session?.user.id || "all")
                        }
                      }}
                    >
                      フィルターをクリア
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 予定実績一覧テーブル */}
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-24">日付</TableHead>
                    <TableHead className="w-32">ユーザー</TableHead>
                    <TableHead className="w-20">出社</TableHead>
                    <TableHead className="w-20">退社</TableHead>
                    <TableHead className="w-24">実績時間</TableHead>
                    <TableHead className="max-w-xs">予定</TableHead>
                    <TableHead className="max-w-xs">実績</TableHead>
                    <TableHead className="w-24">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        {Array.from({ length: 8 }).map((_, j) => (
                          <TableCell key={j}>
                            <Skeleton className="h-4 w-full" />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : schedules.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8">
                        予定実績が見つかりません
                      </TableCell>
                    </TableRow>
                  ) : (
                    schedules.map((schedule) => (
                      <TableRow 
                        key={schedule.id}
                        className={!schedule.checkOutTime ? "bg-blue-50" : ""}
                      >
                        <TableCell className="font-medium">
                          {formatDate(schedule.scheduleDate)}
                        </TableCell>
                        <TableCell>
                          {schedule.user.lastName} {schedule.user.firstName}
                        </TableCell>
                        <TableCell>{schedule.checkInTime || "-"}</TableCell>
                        <TableCell>{schedule.checkOutTime || "-"}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {getTotalHours(schedule.actuals).toFixed(2)}h
                          </div>
                        </TableCell>
                        <TableCell className="max-w-xs">
                          <div className="flex flex-wrap gap-1 max-w-xs">
                            {schedule.plans.slice(0, 2).map((plan, index) => (
                              <Badge key={index} variant="outline" className="text-xs max-w-[150px] truncate text-left justify-start">
                                {plan.content}
                              </Badge>
                            ))}
                            {schedule.plans.length > 2 && (
                              <Badge variant="outline" className="text-xs">
                                +{schedule.plans.length - 2}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="max-w-xs">
                          <div className="flex flex-wrap gap-1 max-w-xs">
                            {schedule.actuals.slice(0, 2).map((actual, index) => (
                              <Badge key={index} variant="secondary" className="text-xs max-w-[150px] truncate text-left justify-start">
                                {actual.content}
                              </Badge>
                            ))}
                            {schedule.actuals.length > 2 && (
                              <Badge variant="secondary" className="text-xs">
                                +{schedule.actuals.length - 2}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              asChild
                            >
                              <Link href={`/schedules/${schedule.id}/edit`}>
                                <Edit className="h-4 w-4" />
                              </Link>
                            </Button>
                            {canEditOrDelete(schedule) && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setDeleteScheduleId(schedule.id)}
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
        </TabsContent>
      </Tabs>

      {/* 削除確認ダイアログ */}
      <Dialog open={!!deleteScheduleId} onOpenChange={() => setDeleteScheduleId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>予定実績の削除</DialogTitle>
            <DialogDescription>
              本当にこの予定実績を削除しますか？この操作は元に戻せません。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteScheduleId(null)}
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