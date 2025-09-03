"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { 
  AlertCircle,
  ArrowRight,
  Clock,
  User,
  Calendar,
  ArrowUpCircle,
  ArrowDownCircle,
  MinusCircle,
  Plus,
  CalendarPlus
} from "lucide-react"

interface Issue {
  id: string
  title: string
  description: string
  status: string
  priority: string
  category?: string
  project: {
    id: string
    projectNumber: string
    projectName: string
  }
  assignee: {
    id: string
    name: string
    employeeNumber: string
  } | null
  dueDate: string | null
  createdAt: string
  updatedAt: string
}

export default function DashboardPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [inProgressIssues, setInProgressIssues] = useState<Issue[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchInProgressIssues = async () => {
      try {
        setIsLoading(true)
        setError(null)
        
        // 対応中（in_progress）の課題のみを取得
        const response = await fetch('/api/issues?status=in_progress&limit=50', {
          cache: 'no-store'
        })

        if (!response.ok) {
          throw new Error('課題の取得に失敗しました')
        }

        const data = await response.json()
        setInProgressIssues(data.issues || [])
      } catch (err: any) {
        console.warn('Error fetching issues:', err)
        setError(err.message)
      } finally {
        setIsLoading(false)
      }
    }

    if (session) {
      fetchInProgressIssues()
    }
  }, [session])

  const handleIssueClick = (issueId: string) => {
    router.push(`/issues/${issueId}`)
  }

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'critical':
      case 'high':
        return <ArrowUpCircle className="h-4 w-4 text-red-500" />
      case 'medium':
        return <MinusCircle className="h-4 w-4 text-yellow-500" />
      case 'low':
        return <ArrowDownCircle className="h-4 w-4 text-blue-500" />
      default:
        return null
    }
  }

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'critical':
        return '緊急'
      case 'high':
        return '高'
      case 'medium':
        return '中'
      case 'low':
        return '低'
      default:
        return priority
    }
  }

  const formatDueDate = (dueDate: string | null) => {
    if (!dueDate) return '期限なし'
    
    const date = new Date(dueDate)
    const today = new Date()
    const diffTime = date.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    const formattedDate = date.toLocaleDateString('ja-JP', {
      month: '2-digit',
      day: '2-digit'
    })

    if (diffDays < 0) {
      return <span className="text-red-600 font-semibold">{formattedDate} (期限切れ)</span>
    } else if (diffDays === 0) {
      return <span className="text-orange-600 font-semibold">{formattedDate} (今日)</span>
    } else if (diffDays === 1) {
      return <span className="text-yellow-600">{formattedDate} (明日)</span>
    } else if (diffDays <= 7) {
      return <span className="text-yellow-600">{formattedDate} ({diffDays}日後)</span>
    }
    
    return formattedDate
  }

  // 今日の日付を取得（YYYY-MM-DD形式）
  const getTodayDate = () => {
    const today = new Date()
    const year = today.getFullYear()
    const month = String(today.getMonth() + 1).padStart(2, '0')
    const day = String(today.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">ダッシュボード</h2>
          <p className="text-muted-foreground">
            本日の業務管理
          </p>
        </div>
        <Button 
          size="lg"
          onClick={() => router.push(`/schedules/new?date=${getTodayDate()}`)}
          className="gap-2"
        >
          <CalendarPlus className="h-5 w-5" />
          今日の予定実績を登録
        </Button>
      </div>

      {/* クイックアクション */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => router.push(`/schedules/new?date=${getTodayDate()}`)}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <CalendarPlus className="h-4 w-4" />
                予定実績登録
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              本日の予定・実績を登録
            </p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => router.push('/schedules')}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                予定実績一覧
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              過去の予定実績を確認
            </p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => router.push('/issues/new')}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Plus className="h-4 w-4" />
                新規課題登録
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              新しい課題を作成
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 対応中課題 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                対応中課題
              </CardTitle>
              <CardDescription>
                現在対応中のすべての課題（{!isLoading && `${inProgressIssues.length}件`}）
              </CardDescription>
            </div>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => router.push('/issues?status=in_progress')}
            >
              課題管理へ
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {error ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-4 flex-1">
                    <Skeleton className="h-6 w-12" />
                    <div className="flex-1">
                      <Skeleton className="h-4 w-3/4 mb-2" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  </div>
                  <Skeleton className="h-8 w-16" />
                </div>
              ))}
            </div>
          ) : inProgressIssues.length === 0 ? (
            <div className="text-center py-8">
              <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">対応中の課題はありません</p>
            </div>
          ) : (
            <div className="space-y-4">
              {inProgressIssues.map((issue) => (
                <div 
                  key={issue.id} 
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-accent transition-colors"
                >
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {getPriorityIcon(issue.priority)}
                      <Badge
                        variant={
                          issue.priority === "critical" || issue.priority === "high"
                            ? "destructive"
                            : issue.priority === "medium"
                            ? "default"
                            : "secondary"
                        }
                      >
                        {getPriorityLabel(issue.priority)}
                      </Badge>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{issue.title}</p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="truncate">
                          {issue.project.projectName}
                        </span>
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {issue.assignee?.name || "未割当"}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatDueDate(issue.dueDate)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleIssueClick(issue.id)}
                  >
                    詳細
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}