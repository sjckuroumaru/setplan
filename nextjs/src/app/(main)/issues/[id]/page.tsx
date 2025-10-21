"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { toast } from "sonner"
import { handleError } from "@/lib/error-handler"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Card,
  CardContent,
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
import { 
  ArrowLeft,
  Edit,
  AlertCircle,
  CheckCircle2,
  Clock,
  CircleDot,
  Calendar,
  User,
  MessageSquare,
  Send,
  ArrowUpCircle,
  ArrowDownCircle,
  MinusCircle,
  ChevronRight,
  BarChart3,
  CalendarClock
} from "lucide-react"
import { Progress } from "@/components/ui/progress"

interface Project {
  id: string
  projectNumber: string
  projectName: string
}

interface User {
  id: string
  name?: string
  lastName?: string
  firstName?: string
  employeeNumber: string
}

interface Comment {
  id: string
  content: string
  createdAt: string
  updatedAt: string
  user: User
}

interface Issue {
  id: string
  title: string
  description: string
  status: string
  priority: string
  category?: string
  labels?: string[]
  project: Project
  reporter: User | null
  assignee: User | null
  dueDate: string | null
  startDate: string | null
  endDate: string | null
  progress: number
  parentIssueId: string | null
  dependencies: string | null
  createdAt: string
  updatedAt: string
  resolvedAt: string | null
  comments: Comment[]
}

// ステータスの定義
const statusConfig = {
  open: { label: "未着手", icon: CircleDot, color: "bg-gray-500" },
  in_progress: { label: "対応中", icon: Clock, color: "bg-blue-500" },
  resolved: { label: "解決済み", icon: CheckCircle2, color: "bg-green-500" },
  closed: { label: "完了", icon: AlertCircle, color: "bg-purple-500" },
}

export default function IssueDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const [comment, setComment] = useState("")
  const [isDataLoading, setIsDataLoading] = useState(true)
  const [isCommentLoading, setIsCommentLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const [issue, setIssue] = useState<Issue | null>(null)
  const [issueId, setIssueId] = useState<string>("")
  const [currentStatus, setCurrentStatus] = useState<string>("")
  const [currentPriority, setCurrentPriority] = useState<string>("")
  const [currentAssignee, setCurrentAssignee] = useState<string>("")
  const [users, setUsers] = useState<User[]>([])

  const status = issue ? statusConfig[issue.status as keyof typeof statusConfig] : null

  useEffect(() => {
    async function fetchData() {
      try {
        setIsDataLoading(true)
        const resolvedParams = await params
        setIssueId(resolvedParams.id)
        
        const issueResponse = await fetch(`/api/issues/${resolvedParams.id}`, { cache: 'no-store' })

        if (!issueResponse.ok) {
          if (issueResponse.status === 404) {
            throw new Error("課題が見つかりません")
          }
          throw new Error("課題の取得に失敗しました")
        }

        const issueData = await issueResponse.json()
        setIssue(issueData.issue)
        setCurrentStatus(issueData.issue.status)
        setCurrentPriority(issueData.issue.priority)
        setCurrentAssignee(issueData.issue.assignee?.id || "unassigned")
        
        // ユーザー一覧を取得（基本情報のみ）
        const usersResponse = await fetch('/api/users?basic=true&limit=1000&status=active', { cache: 'no-store' })
        if (usersResponse.ok) {
          const usersData = await usersResponse.json()
          // ユーザーデータに name プロパティを追加
          const usersWithName = usersData.users.map((user: any) => ({
            ...user,
            name: user.name || `${user.lastName} ${user.firstName}`
          }))
          setUsers(usersWithName)
        }
      } catch (err: any) {
        const errorMessage = handleError(err, "課題の取得に失敗しました")
        setError(errorMessage)
      } finally {
        setIsDataLoading(false)
      }
    }

    fetchData()
  }, [params])

  const handleStatusChange = async (value: string) => {
    setCurrentStatus(value)
    try {
      const response = await fetch(`/api/issues/${issueId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: value }),
      })

      if (!response.ok) {
        throw new Error("ステータスの更新に失敗しました")
      }

      const data = await response.json()
      setIssue(data.issue)
      toast.success("ステータスを更新しました")
    } catch (err: any) {
      handleError(err, "ステータスの更新に失敗しました")
    }
  }

  const handlePriorityChange = async (value: string) => {
    setCurrentPriority(value)
    try {
      const response = await fetch(`/api/issues/${issueId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ priority: value }),
      })

      if (!response.ok) {
        throw new Error("優先度の更新に失敗しました")
      }

      const data = await response.json()
      setIssue(data.issue)
      toast.success("優先度を更新しました")
    } catch (err: any) {
      handleError(err, "優先度の更新に失敗しました")
    }
  }

  const handleAssigneeChange = async (value: string) => {
    setCurrentAssignee(value)
    try {
      const response = await fetch(`/api/issues/${issueId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ assigneeId: value === "unassigned" ? null : value }),
      })

      if (!response.ok) {
        throw new Error("担当者の更新に失敗しました")
      }

      const data = await response.json()
      setIssue(data.issue)
      setCurrentAssignee(data.issue.assignee?.id || "unassigned")
      toast.success("担当者を更新しました")
    } catch (err: any) {
      handleError(err, "担当者の更新に失敗しました")
    }
  }

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!comment.trim()) return

    setIsCommentLoading(true)
    try {
      const response = await fetch(`/api/issues/${issueId}/comments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ content: comment }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "コメントの投稿に失敗しました")
      }

      const data = await response.json()
      
      // コメントを追加して課題データを更新
      if (issue) {
        setIssue({
          ...issue,
          comments: [...issue.comments, data.comment]
        })
      }
      
      setComment("")
      toast.success("コメントを追加しました")
    } catch (err: any) {
      handleError(err, "コメントの追加に失敗しました")
    } finally {
      setIsCommentLoading(false)
    }
  }

  if (isDataLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="text-3xl font-bold tracking-tight">課題詳細</h2>
            <p className="text-muted-foreground">読み込み中...</p>
          </div>
        </div>

        <div className="space-y-6">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    )
  }

  if (error || !issue) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="text-3xl font-bold tracking-tight">課題詳細</h2>
          </div>
        </div>

        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {error || "課題が見つかりません"}
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-3xl font-bold tracking-tight">{issue.title}</h2>
              {status && (
                <div className="flex items-center gap-1">
                  <div className={`w-2 h-2 rounded-full ${status.color}`} />
                  <span className="text-sm font-medium">{status.label}</span>
                </div>
              )}
            </div>
            <p className="text-muted-foreground">
              {issue.project.projectNumber} - {issue.project.projectName}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Link href={`/issues/${issueId}/edit`}>
            <Button variant="outline">
              <Edit className="mr-2 h-4 w-4" />
              編集
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* メインコンテンツ */}
        <div className="md:col-span-2 space-y-6">
          {/* 課題詳細 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">{issue.title}</CardTitle>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <User className="h-3 w-3" />
                  <span>報告者: {issue.reporter?.name || '未設定'}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  <span>作成: {new Date(issue.createdAt).toLocaleDateString('ja-JP')}</span>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="prose prose-sm max-w-none">
                <pre className="whitespace-pre-wrap font-sans">{issue.description}</pre>
              </div>
            </CardContent>
          </Card>

          {/* コメント */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                コメント ({issue.comments?.length || 0})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {issue.comments?.map((comment) => (
                <div key={comment.id} className="flex gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="text-xs">
                      {comment.user.name?.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{comment.user.name}</span>
                      {comment.user.id === issue.reporter?.id && (
                        <Badge variant="outline" className="text-xs">報告者</Badge>
                      )}
                      {comment.user.id === issue.assignee?.id && (
                        <Badge variant="outline" className="text-xs">担当者</Badge>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {new Date(comment.createdAt).toLocaleString('ja-JP')}
                      </span>
                    </div>
                    <p className="text-sm">{comment.content}</p>
                  </div>
                </div>
              ))}
              
              <Separator />
              
              <form onSubmit={handleCommentSubmit} className="space-y-2">
                <Textarea
                  placeholder="コメントを入力..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  rows={3}
                  className="w-full"
                  maxLength={5000}
                />
                <div className="flex justify-end">
                  <Button type="submit" size="sm" disabled={isCommentLoading}>
                    <Send className="mr-2 h-4 w-4" />
                    {isCommentLoading ? "送信中..." : "送信"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* サイドバー */}
        <div className="space-y-6">
          {/* ステータス・優先度 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">詳細情報</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs">ステータス</Label>
                <Select value={currentStatus} onValueChange={handleStatusChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-blue-500" />
                        未対応
                      </div>
                    </SelectItem>
                    <SelectItem value="in_progress">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-yellow-500" />
                        対応中
                      </div>
                    </SelectItem>
                    <SelectItem value="resolved">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-green-500" />
                        解決済
                      </div>
                    </SelectItem>
                    <SelectItem value="closed">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-gray-500" />
                        クローズ
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs">優先度</Label>
                <Select value={currentPriority} onValueChange={handlePriorityChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="critical">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-red-600" />
                        緊急
                      </div>
                    </SelectItem>
                    <SelectItem value="high">
                      <div className="flex items-center gap-2">
                        <ArrowUpCircle className="h-4 w-4 text-red-500" />
                        高
                      </div>
                    </SelectItem>
                    <SelectItem value="medium">
                      <div className="flex items-center gap-2">
                        <MinusCircle className="h-4 w-4 text-yellow-500" />
                        中
                      </div>
                    </SelectItem>
                    <SelectItem value="low">
                      <div className="flex items-center gap-2">
                        <ArrowDownCircle className="h-4 w-4 text-blue-500" />
                        低
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs">担当者</Label>
                <Select value={currentAssignee} onValueChange={handleAssigneeChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">未割当</SelectItem>
                    {users.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.name} ({user.employeeNumber})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs">期限</Label>
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4" />
                  {issue.dueDate ? new Date(issue.dueDate).toLocaleDateString('ja-JP') : '未設定'}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ガントチャート情報 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                ガントチャート情報
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs flex items-center gap-1">
                  <CalendarClock className="h-3 w-3" />
                  開始日
                </Label>
                <div className="text-sm">
                  {issue.startDate ? new Date(issue.startDate).toLocaleDateString('ja-JP') : '未設定'}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs flex items-center gap-1">
                  <CalendarClock className="h-3 w-3" />
                  終了日
                </Label>
                <div className="text-sm">
                  {issue.endDate ? new Date(issue.endDate).toLocaleDateString('ja-JP') : '未設定'}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs">進捗率</Label>
                <div className="space-y-2">
                  <Progress value={issue.progress || 0} className="h-2" />
                  <div className="text-sm text-muted-foreground text-right">
                    {issue.progress || 0}%
                  </div>
                </div>
              </div>

              {issue.parentIssueId && (
                <div className="space-y-2">
                  <Label className="text-xs">親タスク</Label>
                  <Link href={`/issues/${issue.parentIssueId}`}>
                    <div className="text-sm text-blue-600 hover:underline flex items-center gap-1">
                      {issue.parentIssueId}
                      <ChevronRight className="h-3 w-3" />
                    </div>
                  </Link>
                </div>
              )}

              {issue.dependencies && (
                <div className="space-y-2">
                  <Label className="text-xs">依存関係</Label>
                  <div className="text-sm text-muted-foreground">
                    {(() => {
                      try {
                        const deps = JSON.parse(issue.dependencies);
                        return Array.isArray(deps) ? deps.join(", ") : issue.dependencies;
                      } catch {
                        return issue.dependencies;
                      }
                    })()}
                  </div>
                </div>
              )}

              <div className="pt-2 border-t">
                <Link href="/gantt">
                  <Button variant="outline" size="sm" className="w-full">
                    <BarChart3 className="mr-2 h-4 w-4" />
                    ガントチャートで表示
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  )
}