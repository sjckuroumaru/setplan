"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"
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
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"
import { AlertCircle, TrendingUp, TrendingDown, Activity } from "lucide-react"

interface Project {
  id: string
  projectNumber: string
  projectName: string
  budget: string | null
  hourlyRate: string | null
}

interface EVMData {
  project: {
    id: string
    projectName: string
    budget: number
    plannedStartDate: string
    plannedEndDate: string
    actualStartDate?: string
    actualEndDate?: string
    status: string
    plannedHours: number
  }
  metrics: {
    pv: number
    ev: number
    ac: number
    sv: number
    cv: number
    spi: number
    cpi: number
    etc: number
    eac: number
  }
  timeSeries: Array<{
    date: string
    pv: number
    ev: number
    ac: number
  }>
  actualHours: Array<{
    userId: string
    userName: string
    totalHours: number
    cost: number
  }>
}

export default function EVMAnalysisPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedProjectId, setSelectedProjectId] = useState<string>("")
  const [evmData, setEvmData] = useState<EVMData | null>(null)
  const [loading, setLoading] = useState(false)
  const [projectLoading, setProjectLoading] = useState(true)
  const [error, setError] = useState("")
  const [projectsInitialized, setProjectsInitialized] = useState(false)

  // 認証チェック
  useEffect(() => {
    if (status === "loading") return

    if (!session) {
      router.push("/login")
      return
    }
  }, [session, status, router])

  // プロジェクト一覧を取得
  useEffect(() => {
    if (!session || projectsInitialized) return

    const fetchProjects = async () => {
      try {
        setProjectLoading(true)
        const response = await fetch("/api/projects?activeOnly=true")
        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || "プロジェクト一覧の取得に失敗しました")
        }

        // 予算が設定されているプロジェクトのみフィルタリング
        const projectsWithBudget = data.projects.filter(
          (project: Project) => project.budget && project.hourlyRate
        )
        setProjects(projectsWithBudget)
        setProjectsInitialized(true)
      } catch (error) {
        console.warn("Fetch projects error:", error)
        setError(error instanceof Error ? error.message : "エラーが発生しました")
      } finally {
        setProjectLoading(false)
      }
    }

    fetchProjects()
  }, [session, projectsInitialized])

  // EVM分析データを取得
  const fetchEVMData = async (projectId: string) => {
    try {
      setLoading(true)
      setError("")

      const response = await fetch(`/api/evm-analysis/${projectId}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "EVM分析データの取得に失敗しました")
      }

      setEvmData(data)
    } catch (error) {
      console.warn("Fetch EVM data error:", error)
      setError(error instanceof Error ? error.message : "エラーが発生しました")
      setEvmData(null)
    } finally {
      setLoading(false)
    }
  }

  // プロジェクト選択時の処理
  const handleProjectSelect = (projectId: string) => {
    setSelectedProjectId(projectId)
    if (projectId) {
      fetchEVMData(projectId)
    } else {
      setEvmData(null)
    }
  }

  // メトリクスカード表示用のヘルパー関数
  const getMetricStatus = (value: number, type: "variance" | "index") => {
    if (type === "variance") {
      return value >= 0 ? "success" : "danger"
    } else {
      return value >= 1 ? "success" : value >= 0.8 ? "warning" : "danger"
    }
  }

  const getMetricIcon = (value: number, type: "variance" | "index") => {
    const status = getMetricStatus(value, type)
    if (status === "success") {
      return <TrendingUp className="h-4 w-4 text-green-600" />
    } else if (status === "warning") {
      return <Activity className="h-4 w-4 text-yellow-600" />
    } else {
      return <TrendingDown className="h-4 w-4 text-red-600" />
    }
  }

  if (status === "loading" || projectLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-[600px]" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">EVM分析</h2>
        <p className="text-muted-foreground">
          プロジェクトの進捗とコストパフォーマンスを分析
        </p>
      </div>

      {/* プロジェクト選択 */}
      <Card>
        <CardHeader>
          <CardTitle>プロジェクト選択</CardTitle>
          <CardDescription>
            分析対象のプロジェクトを選択してください
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={selectedProjectId} onValueChange={handleProjectSelect}>
            <SelectTrigger className="w-full md:w-[400px]">
              <SelectValue placeholder="プロジェクトを選択" />
            </SelectTrigger>
            <SelectContent>
              {projects.length === 0 ? (
                <SelectItem value="no-projects" disabled>
                  予算が設定されたプロジェクトがありません
                </SelectItem>
              ) : (
                projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.projectNumber} - {project.projectName}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <Skeleton key={i} className="h-[120px]" />
          ))}
        </div>
      )}

      {evmData && !loading && (
        <>
          {/* プロジェクト情報 */}
          <Card>
            <CardHeader>
              <CardTitle>{evmData.project.projectName}</CardTitle>
              <CardDescription>
                予算: ¥{evmData.project.budget.toLocaleString()} |
                計画時間: {evmData.project.plannedHours}時間 |
                期間: {new Date(evmData.project.plannedStartDate).toLocaleDateString()} - {new Date(evmData.project.plannedEndDate).toLocaleDateString()}
              </CardDescription>
            </CardHeader>
          </Card>

          {/* メトリクスカード */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">計画価値 (PV)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  ¥{evmData.metrics.pv.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  現時点で完了すべき作業の価値
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  (計画進捗率 × 総予算)
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">出来高価値 (EV)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  ¥{evmData.metrics.ev.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  実際に完了した作業の価値
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  (実績時間 / 計画時間 × 総予算)
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">実コスト (AC)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  ¥{evmData.metrics.ac.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  実際に発生したコスト
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  (実績時間 × 時間単価)
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">完成時総コスト予測 (EAC)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  ¥{evmData.metrics.eac.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  プロジェクト完了時の総コスト予測
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  (AC + (BAC - EV / CPI))
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  スケジュール差異 (SV)
                  {getMetricIcon(evmData.metrics.sv, "variance")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${evmData.metrics.sv >= 0 ? "text-green-600" : "text-red-600"}`}>
                  ¥{evmData.metrics.sv.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {evmData.metrics.sv >= 0 ? "計画より進んでいます" : "計画より遅れています"}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  (EV - PV)
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  コスト差異 (CV)
                  {getMetricIcon(evmData.metrics.cv, "variance")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${evmData.metrics.cv >= 0 ? "text-green-600" : "text-red-600"}`}>
                  ¥{evmData.metrics.cv.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {evmData.metrics.cv >= 0 ? "予算内です" : "予算を超過しています"}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  (EV - AC)
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  スケジュール効率指数 (SPI)
                  {getMetricIcon(evmData.metrics.spi, "index")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${
                  evmData.metrics.spi >= 1 ? "text-green-600" :
                  evmData.metrics.spi >= 0.8 ? "text-yellow-600" : "text-red-600"
                }`}>
                  {evmData.metrics.spi}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  (EV / PV)
                </p>
                <Badge variant={
                  evmData.metrics.spi >= 1 ? "default" :
                  evmData.metrics.spi >= 0.8 ? "secondary" : "destructive"
                }>
                  {evmData.metrics.spi >= 1 ? "良好" :
                   evmData.metrics.spi >= 0.8 ? "注意" : "要改善"}
                </Badge>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  コスト効率指数 (CPI)
                  {getMetricIcon(evmData.metrics.cpi, "index")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${
                  evmData.metrics.cpi >= 1 ? "text-green-600" :
                  evmData.metrics.cpi >= 0.8 ? "text-yellow-600" : "text-red-600"
                }`}>
                  {evmData.metrics.cpi}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  (EV / AC)
                </p>
                <Badge variant={
                  evmData.metrics.cpi >= 1 ? "default" :
                  evmData.metrics.cpi >= 0.8 ? "secondary" : "destructive"
                }>
                  {evmData.metrics.cpi >= 1 ? "良好" :
                   evmData.metrics.cpi >= 0.8 ? "注意" : "要改善"}
                </Badge>
              </CardContent>
            </Card>
          </div>

          {/* 時系列グラフ */}
          <Card>
            <CardHeader>
              <CardTitle>EVM推移グラフ</CardTitle>
              <CardDescription>
                PV（計画価値）、EV（出来高価値）、AC（実コスト）の推移
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart
                  data={evmData.timeSeries}
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(date) => new Date(date).toLocaleDateString("ja-JP", { month: "short", day: "numeric" })}
                  />
                  <YAxis
                    tickFormatter={(value) => `¥${(value / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    formatter={(value: number) => `¥${value.toLocaleString()}`}
                    labelFormatter={(date) => new Date(date).toLocaleDateString("ja-JP")}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="pv"
                    stroke="#8b5cf6"
                    strokeWidth={2}
                    name="PV (計画価値)"
                  />
                  <Line
                    type="monotone"
                    dataKey="ev"
                    stroke="#10b981"
                    strokeWidth={2}
                    name="EV (出来高価値)"
                  />
                  <Line
                    type="monotone"
                    dataKey="ac"
                    stroke="#f59e0b"
                    strokeWidth={2}
                    name="AC (実コスト)"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* ユーザー別実績時間 */}
          <Card>
            <CardHeader>
              <CardTitle>ユーザー別実績時間</CardTitle>
              <CardDescription>
                プロジェクトメンバーの作業時間とコスト
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>メンバー</TableHead>
                    <TableHead className="text-right">作業時間</TableHead>
                    <TableHead className="text-right">コスト</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {evmData.actualHours.map((user) => (
                    <TableRow key={user.userId}>
                      <TableCell>{user.userName}</TableCell>
                      <TableCell className="text-right">{user.totalHours}時間</TableCell>
                      <TableCell className="text-right">¥{user.cost.toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="font-semibold">
                    <TableCell>合計</TableCell>
                    <TableCell className="text-right">
                      {evmData.actualHours.reduce((sum, user) => sum + user.totalHours, 0)}時間
                    </TableCell>
                    <TableCell className="text-right">
                      ¥{evmData.actualHours.reduce((sum, user) => sum + user.cost, 0).toLocaleString()}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}