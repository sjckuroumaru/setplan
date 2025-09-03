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
import { ProjectSelect } from "@/components/ui/project-select"
import { Alert, AlertDescription } from "@/components/ui/alert"
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
  CircleDot,
  CalendarClock,
  Percent,
} from "lucide-react"
import { Slider } from "@/components/ui/slider"

interface User {
  id: string
  employeeNumber: string
  lastName: string
  firstName: string
  department?: string
}

export default function NewIssuePage() {
  const router = useRouter()
  const { data: session } = useSession()
  const [isLoading, setIsLoading] = useState(false)
  const [users, setUsers] = useState<User[]>([])
  const [isDataLoading, setIsDataLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    projectId: "",
    priority: "medium",
    status: "in_progress",
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
        const usersResponse = await fetch("/api/users?basic=true&limit=1000&status=active", { cache: 'no-store' })

        if (!usersResponse.ok) {
          throw new Error("データの取得に失敗しました")
        }

        const usersData = await usersResponse.json()

        setUsers(usersData.users || [])

        // 担当者の初期値を現在のユーザーに設定
        if (session?.user?.id) {
          setFormData(prev => ({
            ...prev,
            assigneeId: session.user.id
          }))
        }
      } catch (err) {
        console.warn("Data fetch error:", err)
        setError("データの読み込みに失敗しました")
      } finally {
        setIsDataLoading(false)
      }
    }

    if (session?.user) {
      fetchData()
    }
  }, [session])

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
        // ガントチャート用フィールド
        startDate: formData.startDate ? new Date(formData.startDate).toISOString() : undefined,
        endDate: formData.endDate ? new Date(formData.endDate).toISOString() : undefined,
        progress: formData.progress,
        parentIssueId: formData.parentIssueId || undefined,
        dependencies: formData.dependencies.length > 0 ? JSON.stringify(formData.dependencies) : undefined,
      }

      const response = await fetch("/api/issues", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(submitData),
      })

      if (!response.ok) {
        const errorMessage = await handleApiError(response, "課題の作成に失敗しました")
        setError(errorMessage)
        return
      }

      toast.success("課題を作成しました")
      router.push("/issues")
    } catch (err: any) {
      const errorMessage = handleError(err, "課題の作成に失敗しました")
      setError(errorMessage)
    } finally {
      setIsLoading(false)
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
            <h2 className="text-3xl font-bold tracking-tight">新規課題登録</h2>
            <p className="text-muted-foreground">
              新しい課題を登録します
            </p>
          </div>
        </div>

        <div className="space-y-6">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/issues">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h2 className="text-3xl font-bold tracking-tight">新規課題登録</h2>
          <p className="text-muted-foreground">
            新しい課題を登録します
          </p>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit}>
        <div className="grid gap-6">
          {/* 基本情報 */}
          <Card>
            <CardHeader>
              <CardTitle>基本情報</CardTitle>
              <CardDescription>
                課題の基本的な情報を入力してください
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
                  placeholder="例: ログイン画面でエラーが発生する"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  required
                  disabled={isLoading}
                  maxLength={255}
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
                  placeholder="課題の詳細な説明、再現手順、期待される動作などを記載してください"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  rows={6}
                  required
                  disabled={isLoading}
                  className="w-full"
                  maxLength={10000}
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
                  <ProjectSelect
                    value={formData.projectId}
                    onValueChange={(value) =>
                      setFormData({ ...formData, projectId: value })
                    }
                    disabled={isLoading}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status">
                    <div className="flex items-center gap-2">
                      <CircleDot className="h-4 w-4" />
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
                      <SelectValue placeholder="ステータスを選択" />
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
                      <SelectValue placeholder="優先度を選択" />
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
                          <div className="w-2 h-2 rounded-full bg-red-500" />
                          高
                        </div>
                      </SelectItem>
                      <SelectItem value="medium">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-yellow-500" />
                          中
                        </div>
                      </SelectItem>
                      <SelectItem value="low">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-blue-500" />
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
                担当者と期限を設定してください
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
                      <SelectValue placeholder="担当者を選択" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unassigned">未割当</SelectItem>
                      {users.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.lastName} {user.firstName} ({user.employeeNumber})
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

          {/* アクションボタン */}
          <div className="flex justify-end gap-4">
            <Link href="/issues">
              <Button type="button" variant="outline" disabled={isLoading}>
                キャンセル
              </Button>
            </Link>
            <Button type="submit" disabled={isLoading}>
              <Save className="mr-2 h-4 w-4" />
              登録
            </Button>
          </div>
        </div>
      </form>
    </div>
  )
}