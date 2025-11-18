"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { usePagination } from "@/hooks/use-pagination"
import { useSchedules } from "@/hooks/use-schedules"
import { useDepartments } from "@/hooks/use-departments"
import { useUsers } from "@/hooks/use-users"
import { PaginationControls } from "@/components/ui/pagination-controls"
import { AttendanceButtons } from "@/components/features/schedules/attendance-buttons"
import { config } from "@/lib/config"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { MultiSelect } from "@/components/ui/multi-select"
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
  AlertCircle,
  Copy,
  SlidersHorizontal,
  RotateCcw,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from "lucide-react"

const workLocationLabels = {
  office: "出社",
  remote: "在宅",
  client_site: "客先常駐",
  business_trip: "外出",
  paid_leave: "有給休暇",
}

type SortColumn = "scheduleDate" | "userName"

export default function SchedulesPage() {
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
  const [userFilter, setUserFilter] = useState<string[]>([])
  const [departmentFilter, setDepartmentFilter] = useState<string[]>([])
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [deleteScheduleId, setDeleteScheduleId] = useState<string | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [duplicateScheduleId, setDuplicateScheduleId] = useState<string | null>(null)
  const [departmentFilterInitialized, setDepartmentFilterInitialized] = useState(false)
  const [appliedSearchQuery, setAppliedSearchQuery] = useState("")
  const [appliedUserFilter, setAppliedUserFilter] = useState<string[]>([])
  const [appliedDepartmentFilter, setAppliedDepartmentFilter] = useState<string[]>([])
  const [appliedStartDate, setAppliedStartDate] = useState("")
  const [appliedEndDate, setAppliedEndDate] = useState("")
  const [sortBy, setSortBy] = useState<SortColumn>("scheduleDate")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")

  // SWRフックでデータ取得
  // フィルターの初期化が完了するまでAPIリクエストをスキップ
  const { schedules, pagination: swrPagination, isLoading, isError, mutate } = useSchedules({
    page: currentPage,
    limit: pagination.limit,
    userIds: appliedUserFilter.length > 0 ? appliedUserFilter : undefined,
    departmentIds: appliedDepartmentFilter.length > 0 ? appliedDepartmentFilter : undefined,
    startDate: appliedStartDate || undefined,
    endDate: appliedEndDate || undefined,
    searchQuery: appliedSearchQuery || undefined,
    sortBy,
    sortOrder,
    enabled: departmentFilterInitialized,
  })

  const { users: usersData } = useUsers({ limit: 1000, basic: true })
  const { departments } = useDepartments()

  // ユーザーリストを整形
  const users = usersData.map((user) => ({
    id: user.id,
    name: `${user.lastName} ${user.firstName}`,
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
    if (!session || departmentFilterInitialized || departments.length === 0) {
      return
    }

    // 部署フィルターの設定
    const departmentExists = session.user.departmentId
      ? departments.some((dept) => dept.id === session.user.departmentId)
      : false
    const resolvedDepartments = departmentExists ? [session.user.departmentId!] : []
    const resolvedUsers = session.user.isAdmin ? [] : [session.user.id]

    setDepartmentFilter(resolvedDepartments)
    setAppliedDepartmentFilter(resolvedDepartments)
    setUserFilter(resolvedUsers)
    setAppliedUserFilter(resolvedUsers)
    setAppliedSearchQuery(searchQuery)
    setAppliedStartDate(startDate)
    setAppliedEndDate(endDate)
    setDepartmentFilterInitialized(true)
  }, [session, departmentFilterInitialized, departments, searchQuery, startDate, endDate])

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

  // フィルター変更時はページを1に戻す
  useEffect(() => {
    resetToFirstPage()
  }, [
    appliedSearchQuery,
    appliedUserFilter,
    appliedDepartmentFilter,
    appliedStartDate,
    appliedEndDate,
    resetToFirstPage,
  ])

  const hasPendingFilterChanges =
    searchQuery !== appliedSearchQuery ||
    JSON.stringify(userFilter) !== JSON.stringify(appliedUserFilter) ||
    JSON.stringify(departmentFilter) !== JSON.stringify(appliedDepartmentFilter) ||
    startDate !== appliedStartDate ||
    endDate !== appliedEndDate

  const handleApplyFilters = () => {
    const normalizedSearch = searchQuery.trim()
    setSearchQuery(normalizedSearch)
    setAppliedSearchQuery(normalizedSearch)
    setAppliedUserFilter(userFilter)
    setAppliedDepartmentFilter(departmentFilter)
    setAppliedStartDate(startDate)
    setAppliedEndDate(endDate)
  }

  const handleClearFilters = () => {
    if (!session) return

    const departmentExists = session.user.departmentId
      ? departments.some((dept) => dept.id === session.user.departmentId)
      : false
    const defaultDepartments = departmentExists ? [session.user.departmentId!] : []
    const defaultUsers = session.user.isAdmin ? [] : [session.user.id]

    setSearchQuery("")
    setStartDate("")
    setEndDate("")
    setUserFilter(defaultUsers)
    setDepartmentFilter(defaultDepartments)

    setAppliedSearchQuery("")
    setAppliedStartDate("")
    setAppliedEndDate("")
    setAppliedUserFilter(defaultUsers)
    setAppliedDepartmentFilter(defaultDepartments)
  }

  const handleSort = (column: SortColumn) => {
    if (sortBy === column) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"))
    } else {
      setSortBy(column)
      setSortOrder(column === "scheduleDate" ? "desc" : "asc")
    }
  }

  const SortIcon = ({ column }: { column: SortColumn }) => {
    if (sortBy !== column) {
      return <ArrowUpDown className="ml-1 inline h-3 w-3 opacity-50" />
    }
    return sortOrder === "asc" ? (
      <ArrowUp className="ml-1 inline h-3 w-3" />
    ) : (
      <ArrowDown className="ml-1 inline h-3 w-3" />
    )
  }

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
      mutate() // SWRでデータ再取得
    } catch (error) {
      console.warn("Delete schedule error:", error)
      toast.error(error instanceof Error ? error.message : "削除に失敗しました")
    } finally {
      setDeleteLoading(false)
    }
  }

  // 予定実績複製
  const handleDuplicate = () => {
    if (!duplicateScheduleId) return

    // URLパラメータでスケジュールIDを渡して新規作成ページへ遷移
    router.push(`/schedules/new?duplicate=true&duplicateId=${duplicateScheduleId}`)
    setDuplicateScheduleId(null)
  }

  // 日付フォーマット
  const formatDate = (date: string | Date) => {
    const dateObj = date instanceof Date ? date : new Date(date)
    return dateObj.toLocaleDateString("ja-JP")
  }

  // 実績時間合計計算
  const getTotalHours = (actuals: Array<{ hours: number }>) => {
    return actuals.reduce((sum, actual) => sum + actual.hours, 0)
  }

  // 実績過不足計算：退社時間 - 出社時間 - 休憩時間 - 実績時間
  const calculateTimeDifference = (schedule: {
    checkInTime: string | null
    checkOutTime: string | null
    breakTime?: number
    actuals: Array<{ hours: number }>
  }) => {
    if (!schedule.checkInTime || !schedule.checkOutTime) {
      return null
    }

    // 時刻をパース（HH:mm形式）
    const parseTime = (timeStr: string): number => {
      const [hours, minutes] = timeStr.split(":").map(Number)
      return hours + minutes / 60
    }

    const checkInHours = parseTime(schedule.checkInTime)
    const checkOutHours = parseTime(schedule.checkOutTime)
    const workHours = checkOutHours - checkInHours
    const totalActualHours = getTotalHours(schedule.actuals)
    const breakTime = schedule.breakTime ?? 0

    // 実績過不足 = 勤務時間 - 休憩時間 - 実績時間
    return (workHours - breakTime - totalActualHours) * -1
  }

  // 編集・削除権限チェック
  const canEditOrDelete = (schedule: { userId: string }) => {
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
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">予定実績管理</h2>
          <p className="text-muted-foreground">
            日々の予定と実績を管理
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
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

      {isError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{isError.message || "エラーが発生しました"}</AlertDescription>
        </Alert>
      )}

      {/* 出勤・退勤ボタン */}
      <AttendanceButtons onAttendanceChange={mutate} />

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
                    <Label htmlFor="user-filter">ユーザー（複数選択可）</Label>
                    <MultiSelect
                      options={users.map((user) => ({
                        label: user.name,
                        value: user.id,
                      }))}
                      selected={userFilter}
                      onChange={setUserFilter}
                      placeholder="ユーザーを選択"
                      emptyMessage="ユーザーが見つかりません"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="department-filter">部署・チーム（複数選択可）</Label>
                    <MultiSelect
                      options={departments.map((dept) => ({
                        label: dept.name,
                        value: dept.id,
                      }))}
                      selected={departmentFilter}
                      onChange={setDepartmentFilter}
                      placeholder="部署・チームを選択"
                      emptyMessage="部署・チームが見つかりません"
                    />
                  </div>
                </div>

                {/* 2行目 */}
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4 items-end">
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
                </div>

                <div className="flex flex-col gap-3 border-t pt-4 mt-2 md:flex-row md:items-center md:justify-between">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <SlidersHorizontal className="h-4 w-4" />
                    条件を変更したら「適用」で一覧を更新します
                  </div>
                  <div className="flex flex-wrap gap-2 justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleClearFilters}
                    >
                      <RotateCcw className="mr-2 h-4 w-4" />
                      クリア
                    </Button>
                    <Button
                      type="button"
                      onClick={handleApplyFilters}
                      disabled={!departmentFilterInitialized || !hasPendingFilterChanges}
                    >
                      適用
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 予定実績一覧テーブル */}
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead
                        className="w-24 cursor-pointer select-none"
                        onClick={() => handleSort("scheduleDate")}
                      >
                        日付<SortIcon column="scheduleDate" />
                      </TableHead>
                      <TableHead
                        className="w-32 cursor-pointer select-none"
                        onClick={() => handleSort("userName")}
                      >
                        ユーザー<SortIcon column="userName" />
                      </TableHead>
                      <TableHead className="w-20">出社</TableHead>
                      <TableHead className="w-20">退社</TableHead>
                      <TableHead className="w-24">実績時間</TableHead>
                      <TableHead className="w-24">実績過不足</TableHead>
                      <TableHead className="min-w-[200px]">予定</TableHead>
                      <TableHead className="min-w-[200px]">実績</TableHead>
                      <TableHead className="min-w-[200px]">実績詳細</TableHead>
                      <TableHead className="w-24">場所</TableHead>
                      <TableHead className="w-24">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                  {isLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        {Array.from({ length: 11 }).map((_, j) => (
                          <TableCell key={j}>
                            <Skeleton className="h-4 w-full" />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : schedules.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={11} className="text-center py-8">
                        予定実績が見つかりません
                      </TableCell>
                    </TableRow>
                  ) : (
                    schedules.map((schedule) => (
                      <TableRow
                        key={schedule.id}
                        className={!schedule.checkOutTime ? "bg-blue-50 cursor-pointer" : "cursor-pointer"}
                        onDoubleClick={() => router.push(`/schedules/${schedule.id}/edit`)}
                      >
                        <TableCell className="font-medium">
                          <Link href={`/schedules/${schedule.id}/edit`} className="text-blue-600 hover:text-blue-800 hover:underline">
                            {formatDate(schedule.scheduleDate)}
                          </Link>
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
                        <TableCell>
                          {(() => {
                            const diff = calculateTimeDifference(schedule)
                            if (diff === null) return "-"
                            const diffAbs = Math.abs(diff)
                            const color = diff < 0 ? "text-red-600" : diff > 0 ? "text-blue-600" : "text-gray-600"
                            const sign = diff < 0 ? "-" : diff > 0 ? "+" : ""
                            return (
                              <div className={`flex items-center gap-1 ${color} font-medium`}>
                                {sign}{diffAbs.toFixed(2)}h
                              </div>
                            )
                          })()}
                        </TableCell>
                        <TableCell className="max-w-xs">
                          <div className="flex flex-wrap gap-1 max-w-xs">
                            {schedule.plans.slice(0, 2).map((plan, index) => (
                              <Badge key={index} variant="outline" className="text-xs max-w-[150px] truncate text-left justify-start">
                                {plan.project?.projectName || '案件未設定'}
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
                                {actual.project?.projectName || '案件未設定'}
                              </Badge>
                            ))}
                            {schedule.actuals.length > 2 && (
                              <Badge variant="secondary" className="text-xs">
                                +{schedule.actuals.length - 2}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="max-w-xs">
                          <div className="flex flex-wrap gap-1 max-w-xs">
                            {schedule.actuals.slice(0, 2).map((actual, index) => (
                              <Badge key={index} variant="secondary" className="text-xs max-w-[150px] truncate text-left justify-start">
                                {actual.content || '-'}
                              </Badge>
                            ))}
                            {schedule.actuals.length > 2 && (
                              <Badge variant="secondary" className="text-xs">
                                +{schedule.actuals.length - 2}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="max-w-xs">
                          {/* <Badge variant=""> */}
                            {workLocationLabels[schedule.workLocation as keyof typeof workLocationLabels]}
                          {/* </Badge> */}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setDuplicateScheduleId(schedule.id)}
                              title="複製"
                            >
                              <Copy className="h-4 w-4" />
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
              </div>
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

      {/* 複製確認ダイアログ */}
      <Dialog open={!!duplicateScheduleId} onOpenChange={() => setDuplicateScheduleId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>予定実績の複製</DialogTitle>
            <DialogDescription>
              この予定実績を複製しますか？新規作成画面に遷移します。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDuplicateScheduleId(null)}
            >
              キャンセル
            </Button>
            <Button
              onClick={handleDuplicate}
            >
              複製
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
