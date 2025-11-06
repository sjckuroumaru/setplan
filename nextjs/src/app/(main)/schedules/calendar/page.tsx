"use client"

import { useState, useEffect, useMemo } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useSchedulesCalendar } from "@/hooks/use-schedules-calendar"
import { useUsers } from "@/hooks/use-users"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  ChevronLeft,
  ChevronRight,
  Plus,
  List,
  Clock,
  AlertCircle,
  Users,
  BarChart3,
  Calendar
} from "lucide-react"
import { cn } from "@/lib/utils"

// データ型定義
interface CalendarEvent {
  type: 'plan' | 'actual'
  content: string
  project?: string
  hours?: number
  time?: string
}

// 月の日付を生成する関数
function generateMonthDays(year: number, month: number) {
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const startDate = new Date(firstDay)
  startDate.setDate(startDate.getDate() - firstDay.getDay())
  
  const days = []
  const current = new Date(startDate)
  
  while (current <= lastDay || current.getDay() !== 0) {
    days.push(new Date(current))
    current.setDate(current.getDate() + 1)
  }
  
  return days
}


export default function CalendarPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [viewMode, setViewMode] = useState<"month" | "day">("month")
  const [selectedUser, setSelectedUser] = useState("all")

  // 日付を文字列キーに変換（日本時間）
  const formatDateKey = (date: Date) => {
    // 日本時間での日付文字列を生成
    const jstOffset = 9 * 60 * 60 * 1000 // JST = UTC + 9時間
    const jstDate = new Date(date.getTime() + jstOffset)
    const year = jstDate.getUTCFullYear()
    const month = String(jstDate.getUTCMonth() + 1).padStart(2, '0')
    const day = String(jstDate.getUTCDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  // 日付範囲を取得（日本時間）
  const getDateRange = (date: Date, mode: "month" | "day") => {
    const jstOffset = 9 * 60 * 60 * 1000 // JST = UTC + 9時間
    const jstDate = new Date(date.getTime() + jstOffset)

    let startDate: Date, endDate: Date

    if (mode === "month") {
      startDate = new Date(jstDate.getUTCFullYear(), jstDate.getUTCMonth(), 1)
      endDate = new Date(jstDate.getUTCFullYear(), jstDate.getUTCMonth() + 1, 0)
    } else {
      startDate = new Date(jstDate)
      endDate = new Date(jstDate)
    }

    return {
      startDate: formatDateKey(new Date(startDate.getTime() - jstOffset)),
      endDate: formatDateKey(new Date(endDate.getTime() - jstOffset))
    }
  }

  // useMemoで日付範囲を計算
  const dateRange = useMemo(() => {
    return getDateRange(currentDate, viewMode)
  }, [currentDate, viewMode, getDateRange])

  // SWRフックでデータ取得
  const { schedules, isLoading, isError } = useSchedulesCalendar({
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
    userId: selectedUser !== "all" ? selectedUser : undefined,
  })

  const { users: usersData } = useUsers()

  // ユーザーリストを整形
  const users = usersData.map((user) => ({
    id: user.id,
    name: `${user.lastName} ${user.firstName}`,
    employeeNumber: user.employeeNumber,
  }))

  // 認証チェック
  useEffect(() => {
    if (status === "loading") return

    if (!session) {
      router.push("/login")
      return
    }
  }, [session, status, router])

  const navigatePrevious = () => {
    const newDate = new Date(currentDate)
    if (viewMode === "month") {
      newDate.setMonth(newDate.getMonth() - 1)
    } else {
      newDate.setDate(newDate.getDate() - 1)
    }
    setCurrentDate(newDate)
  }

  const navigateNext = () => {
    const newDate = new Date(currentDate)
    if (viewMode === "month") {
      newDate.setMonth(newDate.getMonth() + 1)
    } else {
      newDate.setDate(newDate.getDate() + 1)
    }
    setCurrentDate(newDate)
  }

  const navigateToday = () => {
    setCurrentDate(new Date())
  }

  // スケジュールデータをカレンダーイベントに変換
  const getEventsForDate = (dateStr: string): CalendarEvent[] => {
    const dateSchedules = schedules.filter(s => s.date === dateStr)
    const events: CalendarEvent[] = []
    
    dateSchedules.forEach(schedule => {
      // 予定を追加
      schedule.plans.forEach(plan => {
        events.push({
          type: 'plan',
          content: plan.content,
          project: plan.project?.name,
        })
      })
      
      // 実績を追加
      schedule.actuals.forEach(actual => {
        events.push({
          type: 'actual',
          content: actual.content,
          project: actual.project?.name,
          hours: actual.hours,
        })
      })
    })
    
    return events
  }

  // 今日の日付取得（日本時間）
  const getTodayString = () => {
    return formatDateKey(new Date())
  }

  const monthDays = generateMonthDays(currentDate.getFullYear(), currentDate.getMonth())
  const todayString = getTodayString()

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
          <h2 className="text-3xl font-bold tracking-tight">カレンダー表示</h2>
          <p className="text-muted-foreground">
            予定と実績をカレンダー形式で確認
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/schedules">
            <Button variant="outline">
              <List className="mr-2 h-4 w-4" />
              一覧表示
            </Button>
          </Link>
          <Link href="/schedules/chart">
            <Button variant="outline">
              <BarChart3 className="mr-2 h-4 w-4" />
              グラフ表示
            </Button>
          </Link>
          <Link href="/schedules/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              新規登録
            </Button>
          </Link>
        </div>
      </div>

      {isError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{isError.message || "エラーが発生しました"}</AlertDescription>
        </Alert>
      )}

      {/* コントロールバー */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={navigatePrevious}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={navigateNext}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                onClick={navigateToday}
              >
                今日
              </Button>
              <h3 className="text-lg font-semibold ml-4">
                {viewMode === "month" && 
                  `${currentDate.getFullYear()}年${currentDate.getMonth() + 1}月`
                }
                {viewMode === "day" && 
                  `${currentDate.getFullYear()}年${currentDate.getMonth() + 1}月${currentDate.getDate()}日`
                }
              </h3>
            </div>

            <div className="flex items-center gap-2">
              <Select value={selectedUser} onValueChange={setSelectedUser}>
                <SelectTrigger className="w-[180px]">
                  <Users className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="ユーザー" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全員</SelectItem>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as "month" | "day")}>
                <TabsList>
                  <TabsTrigger value="month">月</TabsTrigger>
                  <TabsTrigger value="day">日</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* カレンダービュー */}
      {viewMode === "month" && (
        <Card>
          <CardContent className="p-0">
            <div className="grid grid-cols-7">
              {["日", "月", "火", "水", "木", "金", "土"].map((day, index) => (
                <div
                  key={day}
                  className={cn(
                    "p-2 text-center text-sm font-medium border-b",
                    index === 0 && "text-red-500",
                    index === 6 && "text-blue-500"
                  )}
                >
                  {day}
                </div>
              ))}
              {isLoading ? (
                Array.from({ length: 42 }).map((_, i) => (
                  <div key={i} className="min-h-[100px] p-2 border-b border-r">
                    <Skeleton className="h-4 w-8 mb-2" />
                    <Skeleton className="h-3 w-full mb-1" />
                    <Skeleton className="h-3 w-3/4" />
                  </div>
                ))
              ) : (
                monthDays.map((date, index) => {
                  const dateKey = formatDateKey(date)
                  const events = getEventsForDate(dateKey)
                  const isCurrentMonth = date.getMonth() === currentDate.getMonth()
                  const isToday = dateKey === todayString
                  
                  return (
                    <div
                      key={index}
                      className={cn(
                        "min-h-[100px] p-2 border-b border-r cursor-pointer hover:bg-muted/50",
                        !isCurrentMonth && "bg-muted/50",
                        isToday && "bg-primary/5",
                        index % 7 === 0 && "border-l"
                      )}
                      onClick={() => {
                        setCurrentDate(date)
                        setViewMode("day")
                      }}
                    >
                      <div className={cn(
                        "text-sm font-medium mb-1",
                        !isCurrentMonth && "text-muted-foreground",
                        isToday && "text-primary"
                      )}>
                        {date.getDate()}
                      </div>
                      <div className="space-y-1">
                        {events.slice(0, 3).map((event, eventIndex) => (
                          <div
                            key={eventIndex}
                            className={cn(
                              "text-xs p-1 rounded truncate",
                              event.type === "plan" 
                                ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                                : "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                            )}
                            title={`${event.content}${event.project ? ` (${event.project})` : ''}${event.hours ? ` - ${event.hours}h` : ''}`}
                          >
                            {event.type === "plan" ? "予" : "実"} {event.content}
                            {event.hours && ` (${event.hours}h)`}
                          </div>
                        ))}
                        {events.length > 3 && (
                          <div className="text-xs text-muted-foreground">
                            他{events.length - 3}件
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </CardContent>
        </Card>
      )}


      {viewMode === "day" && (
        <div className="grid gap-6">
          {/* 予定実績一覧 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                予定実績一覧
              </CardTitle>
              <CardDescription>
                {currentDate.getFullYear()}年{currentDate.getMonth() + 1}月{currentDate.getDate()}日
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="p-4 border rounded-lg">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1 space-y-1">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-3 w-2/3" />
                      </div>
                      <Skeleton className="h-6 w-16" />
                    </div>
                  </div>
                ))
              ) : schedules.filter(s => s.date === formatDateKey(currentDate)).length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">予定実績が登録されていません</p>
              ) : (
                schedules.filter(s => s.date === formatDateKey(currentDate)).map((schedule) => (
                  <div
                    key={schedule.id}
                    className="p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => router.push(`/schedules/${schedule.id}/edit`)}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium">{schedule.user.name}</span>
                          {schedule.checkInTime && (
                            <Badge variant="outline" className="text-xs">
                              {schedule.checkInTime} - {schedule.checkOutTime || '---'}
                            </Badge>
                          )}
                        </div>
                        {schedule.totalHours > 0 && (
                          <Badge variant="secondary" className="mb-2">
                            <Clock className="mr-1 h-3 w-3" />
                            合計 {schedule.totalHours}h
                          </Badge>
                        )}
                      </div>
                    </div>
                    
                    {/* 予定一覧 */}
                    {schedule.plans.length > 0 && (
                      <div className="mb-3">
                        <h4 className="text-sm font-medium text-blue-600 mb-2">予定 ({schedule.plans.length}件)</h4>
                        <div className="space-y-1">
                          {schedule.plans.map((plan) => (
                            <div key={plan.id} className="text-sm pl-2 border-l-2 border-blue-200">
                              <span className="font-medium">{plan.content}</span>
                              {plan.project && (
                                <span className="text-muted-foreground ml-2">({plan.project.name})</span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* 実績一覧 */}
                    {schedule.actuals.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium text-green-600 mb-2">実績 ({schedule.actuals.length}件)</h4>
                        <div className="space-y-1">
                          {schedule.actuals.map((actual) => (
                            <div key={actual.id} className="text-sm pl-2 border-l-2 border-green-200 flex items-center justify-between">
                              <div>
                                <span className="font-medium">{actual.content}</span>
                                {actual.project && (
                                  <span className="text-muted-foreground ml-2">({actual.project.name})</span>
                                )}
                              </div>
                              <span className="text-xs text-muted-foreground">{actual.hours}h</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* 所感 */}
                    {schedule.reflection && (
                      <div className="mt-3 pt-3 border-t">
                        <p className="text-sm text-muted-foreground">
                          <span className="font-medium">所感: </span>
                          {schedule.reflection}
                        </p>
                      </div>
                    )}
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* サマリー */}
          <Card>
            <CardHeader>
              <CardTitle>日次サマリー</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="grid gap-4 md:grid-cols-4">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="space-y-2">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-8 w-16" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-4">
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">登録数</p>
                    <p className="text-2xl font-bold">
                      {schedules.filter(s => s.date === formatDateKey(currentDate)).length}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">予定数</p>
                    <p className="text-2xl font-bold">
                      {schedules.filter(s => s.date === formatDateKey(currentDate))
                        .reduce((sum, s) => sum + s.plans.length, 0)}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">実績数</p>
                    <p className="text-2xl font-bold">
                      {schedules.filter(s => s.date === formatDateKey(currentDate))
                        .reduce((sum, s) => sum + s.actuals.length, 0)}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">総実績時間</p>
                    <p className="text-2xl font-bold">
                      {schedules.filter(s => s.date === formatDateKey(currentDate))
                        .reduce((sum, s) => sum + s.totalHours, 0)}h
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* 凡例 */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-blue-100 dark:bg-blue-900/30"></div>
              <span className="text-sm">予定</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-green-100 dark:bg-green-900/30"></div>
              <span className="text-sm">実績</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-primary/5"></div>
              <span className="text-sm">今日</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}