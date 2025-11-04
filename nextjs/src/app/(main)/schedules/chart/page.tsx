"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useSchedulesAnalytics } from "@/hooks/use-schedules-analytics"
import { useUsers } from "@/hooks/use-users"
import { useProjects } from "@/hooks/use-projects"
import { useDepartments } from "@/hooks/use-departments"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { 
  Calendar,
  List,
  Clock,
  Users,
  Filter,
  CalendarDays,
  X,
  AlertCircle
} from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts"

// カラーパレット
const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"]

// カスタムツールチップ
const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ color: string; name: string; value: number }>; label?: string }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-background border rounded-lg shadow-lg p-3">
        <p className="font-medium">{label}</p>
        {payload.map((entry, index: number) => (
          <p key={index} style={{ color: entry.color }} className="text-sm">
            {entry.name}: {entry.value}h
          </p>
        ))}
      </div>
    )
  }
  return null
}

export default function ChartPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [period, setPeriod] = useState("month")
  const [selectedProject, setSelectedProject] = useState("all")
  const [selectedUser, setSelectedUser] = useState("all")
  const [selectedDepartment, setSelectedDepartment] = useState("all")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [isCustomDateRange, setIsCustomDateRange] = useState(false)

  // SWRフックでデータ取得
  const {
    userProjectData,
    projectDistribution,
    tableData,
    statistics,
    isLoading,
    isError
  } = useSchedulesAnalytics({
    startDate: startDate || "",
    endDate: endDate || "",
    userId: selectedUser !== "all" ? selectedUser : undefined,
    projectId: selectedProject !== "all" ? selectedProject : undefined,
    departmentId: selectedDepartment !== "all" ? selectedDepartment : undefined,
  })

  const { users: usersData } = useUsers()
  const { projects: projectsData } = useProjects({ page: 1, limit: 1000 })
  const { departments } = useDepartments()

  // ユーザーリストを整形
  const users = usersData.map((user) => ({
    id: user.id,
    name: `${user.lastName} ${user.firstName}`,
    employeeNumber: user.employeeNumber,
  }))

  // プロジェクトリストを整形
  const projects = projectsData.map((project) => ({
    id: project.id,
    projectNumber: project.projectNumber,
    projectName: project.projectName,
  }))

  // 認証チェック
  useEffect(() => {
    if (status === "loading") return

    if (!session) {
      router.push("/login")
      return
    }
  }, [session, status, router])

  // プリセット期間選択時の日付設定
  useEffect(() => {
    const today = new Date()
    let startYear = today.getFullYear()
    let startMonth = today.getMonth()
    let startDay = today.getDate()
    let endYear = today.getFullYear()
    let endMonth = today.getMonth()
    let endDay = today.getDate()

    switch (period) {
      case "week":
        const weekStart = new Date(today)
        weekStart.setDate(today.getDate() - 7)
        startYear = weekStart.getFullYear()
        startMonth = weekStart.getMonth()
        startDay = weekStart.getDate()
        break
      case "last-week":
        const lastWeekStart = new Date(today)
        lastWeekStart.setDate(today.getDate() - 14)
        const lastWeekEnd = new Date(today)
        lastWeekEnd.setDate(today.getDate() - 7)
        startYear = lastWeekStart.getFullYear()
        startMonth = lastWeekStart.getMonth()
        startDay = lastWeekStart.getDate()
        endYear = lastWeekEnd.getFullYear()
        endMonth = lastWeekEnd.getMonth()
        endDay = lastWeekEnd.getDate()
        break
      case "month":
        // 今月の1日から月末まで
        startDay = 1
        const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0)
        endDay = monthEnd.getDate()
        break
      case "last-month":
        // 前月の1日から最終日まで
        const lastMonthDate = new Date(today.getFullYear(), today.getMonth() - 1, 1)
        startYear = lastMonthDate.getFullYear()
        startMonth = lastMonthDate.getMonth()
        startDay = 1
        const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0)
        endYear = lastMonthEnd.getFullYear()
        endMonth = lastMonthEnd.getMonth()
        endDay = lastMonthEnd.getDate()
        break
      case "custom":
        setIsCustomDateRange(true)
        return
      default:
        break
    }

    if (period !== "custom") {
      setIsCustomDateRange(false)
      // ローカル日付文字列を作成（タイムゾーン変換を避ける）
      const startDateStr = `${startYear}-${String(startMonth + 1).padStart(2, '0')}-${String(startDay).padStart(2, '0')}`
      const endDateStr = `${endYear}-${String(endMonth + 1).padStart(2, '0')}-${String(endDay).padStart(2, '0')}`
      setStartDate(startDateStr)
      setEndDate(endDateStr)
    }
  }, [period])

  // 日付範囲のクリア
  const clearDateRange = () => {
    setStartDate("")
    setEndDate("")
    setPeriod("month")
    setIsCustomDateRange(false)
  }

  if (status === "loading" || !session) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-gray-200 animate-pulse rounded" />
        <div className="h-[600px] bg-gray-200 animate-pulse rounded" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">グラフ表示</h2>
          <p className="text-muted-foreground">
            実績時間の分析とビジュアライゼーション
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/schedules">
            <Button variant="outline">
              <List className="mr-2 h-4 w-4" />
              一覧表示
            </Button>
          </Link>
          <Link href="/schedules/calendar">
            <Button variant="outline">
              <Calendar className="mr-2 h-4 w-4" />
              カレンダー
            </Button>
          </Link>
        </div>
      </div>

      {/* フィルター */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">フィルター:</span>
            </div>
            
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="期間" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="week">今週</SelectItem>
                <SelectItem value="last-week">先週</SelectItem>
                <SelectItem value="month">今月</SelectItem>
                <SelectItem value="last-month">先月</SelectItem>
                <SelectItem value="custom">カスタム</SelectItem>
              </SelectContent>
            </Select>

            {/* 日付範囲選択 */}
            {isCustomDateRange && (
              <>
                <div className="flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-muted-foreground" />
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-[150px]"
                    placeholder="開始日"
                  />
                  <span className="text-sm text-muted-foreground">〜</span>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-[150px]"
                    placeholder="終了日"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={clearDateRange}
                    className="h-8 w-8"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </>
            )}

            <Select value={selectedProject} onValueChange={setSelectedProject}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="案件" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">すべての案件</SelectItem>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.projectName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedUser} onValueChange={setSelectedUser}>
              <SelectTrigger className="w-[150px]">
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

            <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="部署・チーム" />
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
        </CardContent>
      </Card>

      {/* エラー表示 */}
      {isError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{isError.message || "エラーが発生しました"}</AlertDescription>
        </Alert>
      )}

      {/* サマリーカード */}
      <div className="grid gap-4 md:grid-cols-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-4" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16 mb-2" />
                <Skeleton className="h-3 w-24 mb-2" />
                <Skeleton className="h-2 w-full" />
              </CardContent>
            </Card>
          ))
        ) : (
          <>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">総実績時間</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statistics.totalHours}h</div>
            <p className="text-xs text-muted-foreground">
              目標: {statistics.targetHours}h
            </p>
            <Progress value={statistics.achievementRate} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">平均実績時間</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statistics.averageHours}h</div>
            <p className="text-xs text-muted-foreground">
              ユーザーあたり/月
            </p>
          </CardContent>
        </Card>
        </>
        )}
      </div>

      {/* メインチャート */}
      <Tabs defaultValue="stacked" className="space-y-4">
        <TabsList>
          <TabsTrigger value="stacked">積み上げ棒グラフ</TabsTrigger>
          <TabsTrigger value="pie">円グラフ</TabsTrigger>
          <TabsTrigger value="table">表分析</TabsTrigger>
        </TabsList>

        <TabsContent value="stacked" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>ユーザー別案件実績時間</CardTitle>
              <CardDescription>
                各ユーザーの案件別作業時間の内訳
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={500}>
                <BarChart data={userProjectData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis 
                    label={{ value: "時間 (h)", angle: -90, position: "insideLeft" }} 
                    domain={[0, 250]}
                    ticks={[0, 50, 100, 150, 200, 250]}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  {/* 動的な案件別バーの生成 */}
                  {projectDistribution.map((project, index) => (
                    <Bar 
                      key={project.name} 
                      dataKey={project.name} 
                      stackId="a" 
                      fill={COLORS[index % COLORS.length]} 
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pie" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>案件別時間配分</CardTitle>
              <CardDescription>
                全体の作業時間における案件の割合
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-8">
                <ResponsiveContainer width="100%" height={450}>
                  <PieChart>
                    <Pie
                      data={projectDistribution}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ percentage }) => `${percentage}%`}
                      outerRadius={140}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {projectDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                
                <div className="space-y-4">
                  <h4 className="text-sm font-medium">案件別詳細</h4>
                  {projectDistribution.map((project, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded" 
                          style={{ backgroundColor: COLORS[index % COLORS.length] }}
                        />
                        <span className="text-sm">{project.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">{project.value}h</Badge>
                        <span className="text-sm text-muted-foreground">
                          {project.percentage}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="table" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>実績時間表分析</CardTitle>
              <CardDescription>
                年月・ユーザー・案件別の実績時間詳細
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>年月</TableHead>
                      <TableHead>名前</TableHead>
                      <TableHead>案件名</TableHead>
                      <TableHead className="text-right">合計時間</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      Array.from({ length: 10 }).map((_, i) => (
                        <TableRow key={i}>
                          <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                          <TableCell className="text-right"><Skeleton className="h-4 w-12" /></TableCell>
                        </TableRow>
                      ))
                    ) : tableData.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                          データがありません
                        </TableCell>
                      </TableRow>
                    ) : (
                      tableData.map((row, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium">
                            {row.yearMonth.replace('-', '年') + '月'}
                          </TableCell>
                          <TableCell>{row.userName}</TableCell>
                          <TableCell>{row.projectName}</TableCell>
                          <TableCell className="text-right font-mono">
                            {row.totalHours}h
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
              
              {/* 合計表示 */}
              {!isLoading && tableData.length > 0 && (
                <div className="mt-6 space-y-4">
                  <div className="flex justify-between items-center p-4 bg-muted/50 rounded-lg">
                    <span className="font-semibold">総合計時間</span>
                    <span className="text-xl font-bold font-mono">
                      {tableData.reduce((sum, row) => sum + row.totalHours, 0)}h
                    </span>
                  </div>
                  
                  {/* ユーザー別小計 */}
                  <div className="grid gap-2">
                    <h4 className="font-medium text-sm text-muted-foreground">ユーザー別小計</h4>
                    {Object.entries(
                      tableData.reduce((acc: Record<string, number>, row) => {
                        acc[row.userName] = (acc[row.userName] || 0) + row.totalHours
                        return acc
                      }, {})
                    )
                    .sort(([, a], [, b]) => (b as number) - (a as number))
                    .map(([userName, total]) => (
                      <div key={userName} className="flex justify-between items-center py-1 px-2 text-sm">
                        <span>{userName}</span>
                        <span className="font-mono">{total}h</span>
                      </div>
                    ))}
                  </div>
                  
                  {/* 案件別小計 */}
                  <div className="grid gap-2">
                    <h4 className="font-medium text-sm text-muted-foreground">案件別小計</h4>
                    {Object.entries(
                      tableData.reduce((acc: Record<string, number>, row) => {
                        acc[row.projectName] = (acc[row.projectName] || 0) + row.totalHours
                        return acc
                      }, {})
                    )
                    .sort(([, a], [, b]) => (b as number) - (a as number))
                    .map(([projectName, total]) => (
                      <div key={projectName} className="flex justify-between items-center py-1 px-2 text-sm">
                        <span>{projectName}</span>
                        <span className="font-mono">{total}h</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>
    </div>
  )
}