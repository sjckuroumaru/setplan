"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import Link from "next/link"
import { toast } from "sonner"
import { handleApiError, handleError } from "@/lib/error-handler"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Alert,
  AlertDescription,
} from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"
import { 
  ArrowLeft, 
  Save,
  AlertCircle,
  Calendar,
  User,
  Flag,
  FolderOpen,
  FileText,
  Info,
  Trash2,
  CheckCircle2,
  CalendarClock,
  Percent,
  ArrowDownCircle,
  MinusCircle,
  ArrowUpCircle,
} from "lucide-react"
import { Slider } from "@/components/ui/slider"

interface Project {
  id: string
  projectNumber: string
  projectName: string
}

interface User {
  id: string
  name: string
  employeeNumber: string
}

interface Issue {
  id: string
  title: string
  description: string
  status: string
  priority: string
  category?: string
  project: Project
  reporter: User | null
  assignee: User | null
  dueDate: string | null
  startDate?: string | null
  endDate?: string | null
  progress?: number
  parentIssueId?: string | null
  dependencies?: string | null
  createdAt: string
  updatedAt: string
  resolvedAt: string | null
  comments: any[]
}

export default function EditIssuePage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const { data: session } = useSession()
  const [isLoading, setIsLoading] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showSuccessAlert, setShowSuccessAlert] = useState(false)
  const [isDataLoading, setIsDataLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const [issue, setIssue] = useState<Issue | null>(null)
  const [projects, setProjects] = useState<Project[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [issueId, setIssueId] = useState<string>("")
  
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    projectId: "",
    priority: "medium",
    status: "open",
    assigneeId: "",
    dueDate: "",
    category: "",
    // ガントチャート用フィールド
    startDate: "",
    endDate: "",
    progress: 0,
    parentIssueId: "",
    dependencies: [] as string[],
  })

  useEffect(() => {
    async function fetchData() {
      try {
        setIsDataLoading(true)
        const resolvedParams = await params
        setIssueId(resolvedParams.id)
        
        const [issueResponse, projectsResponse, usersResponse] = await Promise.all([
          fetch(`/api/issues/${resolvedParams.id}`, { cache: 'no-store' }),
          fetch("/api/projects?limit=1000", { cache: 'no-store' }),
          fetch("/api/users?basic=true&limit=1000&status=active", { cache: 'no-store' })
        ])

        if (!issueResponse.ok) {
          if (issueResponse.status === 404) {
            throw new Error("課題が見つかりません")
          }
          throw new Error("課題の取得に失敗しました")
        }

        if (!projectsResponse.ok || !usersResponse.ok) {
          throw new Error("データの取得に失敗しました")
        }

        const issueData = await issueResponse.json()
        const projectsData = await projectsResponse.json()
        const usersData = await usersResponse.json()

        setIssue(issueData.issue)
        setProjects(projectsData.projects || [])
        // ユーザーデータに name プロパティを追加
        const usersWithName = (usersData.users || []).map((user: any) => ({
          ...user,
          name: user.name || `${user.lastName} ${user.firstName}`
        }))
        setUsers(usersWithName)

        // フォームデータを初期化
        const issue = issueData.issue
        setFormData({
          title: issue.title,
          description: issue.description,
          projectId: issue.project.id,
          priority: issue.priority,
          status: issue.status,
          assigneeId: issue.assignee?.id || "unassigned",
          dueDate: issue.dueDate ? issue.dueDate.split('T')[0] : "",
          category: issue.category || "",
          // ガントチャート用フィールド
          startDate: issue.startDate ? issue.startDate.split('T')[0] : "",
          endDate: issue.endDate ? issue.endDate.split('T')[0] : "",
          progress: issue.progress || 0,
          parentIssueId: issue.parentIssueId || "",
          dependencies: issue.dependencies ? JSON.parse(issue.dependencies) : [],
        })
      } catch (err: any) {
        const errorMessage = handleError(err, "課題の取得に失敗しました")
        setError(errorMessage)
      } finally {
        setIsDataLoading(false)
      }
    }

    fetchData()
  }, [params])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    
    try {
      const submitData = {
        title: formData.title,
        description: formData.description,
        projectId: formData.projectId,
        priority: formData.priority,
        status: formData.status,
        category: formData.category || undefined,
        assigneeId: formData.assigneeId && formData.assigneeId !== "unassigned" ? formData.assigneeId : undefined,
        dueDate: formData.dueDate ? new Date(formData.dueDate).toISOString() : undefined,
        startDate: formData.startDate ? new Date(formData.startDate).toISOString() : undefined,
        endDate: formData.endDate ? new Date(formData.endDate).toISOString() : undefined,
        progress: formData.progress,
      }

      const response = await fetch(`/api/issues/${issueId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(submitData),
      })

      if (!response.ok) {
        const errorMessage = await handleApiError(response, "課題の更新に失敗しました")
        setError(errorMessage)
        return
      }

      toast.success("課題を更新しました")
      router.push(`/issues/${issueId}`)
    } catch (err: any) {
      const errorMessage = handleError(err, "課題の更新に失敗しました")
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async () => {
    try {
      const response = await fetch(`/api/issues/${issueId}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const errorMessage = await handleApiError(response, "課題の削除に失敗しました")
        setError(errorMessage)
        return
      }

      toast.success("課題を削除しました")
      router.push("/issues")
    } catch (err: any) {
      const errorMessage = handleError(err, "課題の削除に失敗しました")
      setError(errorMessage)
    }
  }

  if (isDataLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/issues">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h2 className="text-3xl font-bold tracking-tight">課題編集</h2>
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
          <Link href="/issues">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h2 className="text-3xl font-bold tracking-tight">課題編集</h2>
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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href={`/issues/${issueId}`}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h2 className="text-3xl font-bold tracking-tight">課題編集</h2>
            <p className="text-muted-foreground">
              {issue.id} - {issue.title}
            </p>
          </div>
        </div>
        <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <DialogTrigger asChild>
            <Button variant="destructive">
              <Trash2 className="mr-2 h-4 w-4" />
              削除
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>課題を削除しますか？</DialogTitle>
              <DialogDescription>
                この操作は取り消すことができません。
                課題とすべての関連データが完全に削除されます。
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
                キャンセル
              </Button>
              <Button variant="destructive" onClick={handleDelete}>
                削除する
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {showSuccessAlert && (
        <Alert className="border-green-500 bg-green-50">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            課題を更新しました。詳細ページに移動します...
          </AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit}>
        <div className="grid gap-6">
          {/* 基本情報 */}
          <Card>
            <CardHeader>
              <CardTitle>基本情報</CardTitle>
              <CardDescription>
                課題の基本的な情報を編集します
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    課題タイトル *
                  </div>
                </Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  required
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    詳細説明 *
                  </div>
                </Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  rows={10}
                  required
                  disabled={isLoading}
                  className="w-full font-mono text-sm"
                />
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="project">
                    <div className="flex items-center gap-2">
                      <FolderOpen className="h-4 w-4" />
                      案件 *
                    </div>
                  </Label>
                  <Select
                    value={formData.projectId}
                    onValueChange={(value) =>
                      setFormData({ ...formData, projectId: value })
                    }
                    disabled={isLoading}
                  >
                    <SelectTrigger id="project">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {projects.map((project) => (
                        <SelectItem key={project.id} value={project.id}>
                          {project.projectNumber} - {project.projectName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-4 w-4" />
                      ステータス *
                    </div>
                  </Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) =>
                      setFormData({ ...formData, status: value })
                    }
                    disabled={isLoading}
                  >
                    <SelectTrigger id="status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="open">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-gray-500" />
                          未着手
                        </div>
                      </SelectItem>
                      <SelectItem value="in_progress">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-blue-500" />
                          対応中
                        </div>
                      </SelectItem>
                      <SelectItem value="resolved">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-green-500" />
                          解決済み
                        </div>
                      </SelectItem>
                      <SelectItem value="closed">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-purple-500" />
                          完了
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="priority">
                    <div className="flex items-center gap-2">
                      <Flag className="h-4 w-4" />
                      優先度 *
                    </div>
                  </Label>
                  <Select
                    value={formData.priority}
                    onValueChange={(value) =>
                      setFormData({ ...formData, priority: value })
                    }
                    disabled={isLoading}
                  >
                    <SelectTrigger id="priority">
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
              </div>
            </CardContent>
          </Card>



          {/* ガントチャート情報 */}
          <Card>
            <CardHeader>
              <CardTitle>ガントチャート情報</CardTitle>
              <CardDescription>
                ガントチャートに表示するための情報を設定してください（任意）
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="startDate">
                    <div className="flex items-center gap-2">
                      <CalendarClock className="h-4 w-4" />
                      開始日
                    </div>
                  </Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={formData.startDate}
                    onChange={(e) =>
                      setFormData({ ...formData, startDate: e.target.value })
                    }
                    disabled={isLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endDate">
                    <div className="flex items-center gap-2">
                      <CalendarClock className="h-4 w-4" />
                      終了日
                    </div>
                  </Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={formData.endDate}
                    onChange={(e) =>
                      setFormData({ ...formData, endDate: e.target.value })
                    }
                    min={formData.startDate}
                    disabled={isLoading}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="progress">
                  <div className="flex items-center gap-2">
                    <Percent className="h-4 w-4" />
                    進捗率: {formData.progress}%
                  </div>
                </Label>
                <div className="flex items-center gap-4">
                  <Slider
                    id="progress"
                    value={[formData.progress]}
                    onValueChange={(value) =>
                      setFormData({ ...formData, progress: value[0] })
                    }
                    min={0}
                    max={100}
                    step={5}
                    className="flex-1"
                    disabled={isLoading}
                  />
                  <Input
                    type="number"
                    value={formData.progress}
                    onChange={(e) => {
                      const value = Math.min(100, Math.max(0, parseInt(e.target.value) || 0))
                      setFormData({ ...formData, progress: value })
                    }}
                    min={0}
                    max={100}
                    className="w-20"
                    disabled={isLoading}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 担当・期限情報 */}
          <Card>
            <CardHeader>
              <CardTitle>担当・期限情報</CardTitle>
              <CardDescription>
                担当者と期限を設定します
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="assignee">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      担当者
                    </div>
                  </Label>
                  <Select
                    value={formData.assigneeId}
                    onValueChange={(value) =>
                      setFormData({ ...formData, assigneeId: value })
                    }
                    disabled={isLoading}
                  >
                    <SelectTrigger id="assignee">
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
                  <Label htmlFor="dueDate">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      期限
                    </div>
                  </Label>
                  <Input
                    id="dueDate"
                    type="date"
                    value={formData.dueDate}
                    onChange={(e) =>
                      setFormData({ ...formData, dueDate: e.target.value })
                    }
                    disabled={isLoading}
                  />
                </div>
              </div>

            </CardContent>
          </Card>


          {/* メタ情報 */}
          <Card>
            <CardHeader>
              <CardTitle>
                <div className="flex items-center gap-2">
                  <Info className="h-4 w-4" />
                  メタ情報
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3 text-sm">
                <div>
                  <span className="text-muted-foreground">報告者:</span>
                  <span className="ml-2 font-medium">{issue.reporter?.name || "不明"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">作成日:</span>
                  <span className="ml-2 font-medium">{new Date(issue.createdAt).toLocaleDateString('ja-JP')}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">更新日:</span>
                  <span className="ml-2 font-medium">{new Date(issue.updatedAt).toLocaleDateString('ja-JP')}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* アクションボタン */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="flex justify-between">
            <Link href={`/issues/${issueId}`}>
              <Button type="button" variant="outline" disabled={isLoading}>
                キャンセル
              </Button>
            </Link>
            <div className="flex gap-2">
              <Button type="submit" disabled={isLoading}>
                <Save className="mr-2 h-4 w-4" />
                更新
              </Button>
            </div>
          </div>
        </div>
      </form>
    </div>
  )
}