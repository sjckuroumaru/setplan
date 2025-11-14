"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Flag,
  CircleDot,
  Clock,
  CheckCircle2,
  ArrowUpCircle,
} from "lucide-react"

interface IssueStatsProps {
  departmentId?: string[]
  projectId?: string
  assigneeId?: string[]
}

interface Stats {
  total: number
  open: number
  inProgress: number
  resolved: number
  closed: number
  highPriority: number
}

export function IssueStats({ departmentId, projectId, assigneeId }: IssueStatsProps) {
  const [stats, setStats] = useState<Stats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchStats() {
      try {
        setIsLoading(true)
        setError(null)

        // 統計用のクエリパラメータを構築
        const params = new URLSearchParams({
          limit: "10000", // すべての課題を取得
        })

        if (departmentId && departmentId.length > 0) {
          departmentId.forEach(id => params.append("departmentId", id))
        }
        if (projectId && projectId !== "all") {
          params.append("projectId", projectId)
        }
        if (assigneeId && assigneeId.length > 0) {
          assigneeId.forEach(id => params.append("assigneeId", id))
        }

        const response = await fetch(`/api/issues?${params.toString()}`)
        if (!response.ok) {
          throw new Error("統計情報の取得に失敗しました")
        }

        const data = await response.json()
        const issues = data.issues || []

        // 統計を計算
        const calculatedStats: Stats = {
          total: issues.length,
          open: issues.filter((issue: any) => issue.status === "open").length,
          inProgress: issues.filter((issue: any) => issue.status === "in_progress").length,
          resolved: issues.filter((issue: any) => issue.status === "resolved").length,
          closed: issues.filter((issue: any) => issue.status === "closed").length,
          highPriority: issues.filter(
            (issue: any) => issue.priority === "high" || issue.priority === "critical"
          ).length,
        }

        setStats(calculatedStats)
      } catch (err) {
        console.error("Stats fetch error:", err)
        setError(err instanceof Error ? err.message : "エラーが発生しました")
      } finally {
        setIsLoading(false)
      }
    }

    fetchStats()
  }, [departmentId, projectId, assigneeId])

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-5">
        {[1, 2, 3, 4, 5].map((i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-12 mb-1" />
              <Skeleton className="h-3 w-20" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (error || !stats) {
    return null
  }

  return (
    <div className="grid gap-4 md:grid-cols-5">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">全課題</CardTitle>
          <Flag className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.total}</div>
          <p className="text-xs text-muted-foreground">
            登録済み課題
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">未対応</CardTitle>
          <CircleDot className="h-4 w-4 text-blue-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.open}</div>
          <p className="text-xs text-muted-foreground">
            新規課題
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">対応中</CardTitle>
          <Clock className="h-4 w-4 text-yellow-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.inProgress}</div>
          <p className="text-xs text-muted-foreground">
            作業中
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">解決済</CardTitle>
          <CheckCircle2 className="h-4 w-4 text-green-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.resolved}</div>
          <p className="text-xs text-muted-foreground">
            完了待ち
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">高優先度</CardTitle>
          <ArrowUpCircle className="h-4 w-4 text-red-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.highPriority}</div>
          <p className="text-xs text-muted-foreground">
            要対応
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
