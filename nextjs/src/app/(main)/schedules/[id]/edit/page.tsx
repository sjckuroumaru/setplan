"use client"

import { useState, useEffect, use } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"
import { ArrowLeft, AlertCircle } from "lucide-react"
import { ScheduleForm } from "@/components/features/schedules/schedule-form"
import { toast } from "sonner"

interface User {
  id: string
  lastName: string
  firstName: string
  employeeNumber: string
}

interface Project {
  id: string
  projectNumber: string
  projectName: string
  status: string
  departmentRef?: {
    id: string
    name: string
  } | null
}

interface Schedule {
  id: string
  userId: string
  scheduleDate: string
  checkInTime: string | null
  checkOutTime: string | null
  breakTime: number | null
  reflection: string | null
  plans: Array<{
    id: string
    projectId: string | null
    content: string
    details: string | null
    project?: Project
  }>
  actuals: Array<{
    id: string
    projectId: string | null
    content: string
    hours: number
    details: string | null
    project?: Project
  }>
}

type ScheduleFormValues = {
  scheduleDate: string
  userId?: string
  checkInTime?: string
  checkOutTime?: string
  breakTime?: number
  reflection?: string
  plans: Array<{
    projectId?: string
    content: string
    details?: string
  }>
  actuals: Array<{
    projectId?: string
    content: string
    hours: number
    details?: string
  }>
}

export default function EditSchedulePage({ params }: { params: Promise<{ id: string }> }) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const resolvedParams = use(params)
  const [schedule, setSchedule] = useState<Schedule | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(true)
  const [users, setUsers] = useState<User[]>([])
  const [showAllProjects, setShowAllProjects] = useState(false)

  // 認証チェック
  useEffect(() => {
    if (status === "loading") return
    
    if (!session) {
      router.push("/login")
      return
    }
  }, [session, status, router])


  // ユーザー一覧取得（管理者のみ）
  const fetchUsers = async () => {
    try {
      const response = await fetch("/api/users?basic=true")
      const data = await response.json()
      if (response.ok) {
        setUsers(data.users)
      }
    } catch (error) {
      console.warn("Failed to fetch users:", error)
    }
  }

  // 予定実績詳細取得
  const fetchSchedule = async () => {
    try {
      setLoading(true)
      setError("")

      const response = await fetch(`/api/schedules/${resolvedParams.id}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "予定実績の取得に失敗しました")
      }

      setSchedule(data.schedule)
    } catch (error) {
      console.warn("Fetch schedule error:", error)
      setError(error instanceof Error ? error.message : "エラーが発生しました")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (session) {
      fetchSchedule()
      // 管理者の場合はユーザー一覧も取得
      if (session.user.isAdmin) {
        fetchUsers()
      }
    }
  }, [session, resolvedParams.id])

  // 編集権限チェック
  const canEdit = () => {
    if (!session || !schedule) return false
    // 管理者または作成者本人のみ編集可能
    return session.user.isAdmin || schedule.userId === session.user.id
  }

  const handleSubmit = async (data: ScheduleFormValues) => {
    try {
      setIsLoading(true)
      setError("")

      // 管理者以外はuserIdを送信しない（サーバー側でも検証）
      const submitData = { ...data }
      if (!session?.user?.isAdmin) {
        delete submitData.userId
      }

      const response = await fetch(`/api/schedules/${resolvedParams.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(submitData),
      })

      const result = await response.json()

      if (!response.ok) {
        // エラーメッセージの処理
        let errorMessage = "予定実績の更新に失敗しました"

        if (result.error) {
          // バリデーションエラーの配列の場合
          if (Array.isArray(result.error)) {
            errorMessage = result.error.map((err: any) => err.message).join(", ")
          }
          // 文字列の場合
          else if (typeof result.error === "string") {
            errorMessage = result.error
          }
        }

        throw new Error(errorMessage)
      }

      toast.success("予定実績を更新しました")
      router.push("/schedules")
    } catch (error) {
      console.warn("Update schedule error:", error)
      const errorMessage = error instanceof Error ? error.message : "エラーが発生しました"
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancel = () => {
    router.push("/schedules")
  }

  if (status === "loading" || !session || loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-[600px]" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/schedules">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h2 className="text-3xl font-bold tracking-tight">
              {canEdit() ? "予定実績編集" : "予定実績詳細"}
            </h2>
            <p className="text-muted-foreground">
              {canEdit() ? "予定実績を編集します" : "予定実績の詳細を閲覧します（閲覧専用）"}
            </p>
          </div>
        </div>
        {session?.user?.departmentId && (
          <Button
            type="button"
            variant={showAllProjects ? "default" : "outline"}
            size="sm"
            onClick={() => setShowAllProjects(!showAllProjects)}
          >
            {showAllProjects ? "所属部署の案件のみ表示" : "全案件を表示"}
          </Button>
        )}
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {schedule && (
        <ScheduleForm
          schedule={schedule}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          isLoading={isLoading}
          isEdit={true}
          readOnly={!canEdit()}
          isAdmin={session?.user?.isAdmin || false}
          users={users}
          showAllProjects={showAllProjects}
          setShowAllProjects={setShowAllProjects}
        />
      )}
    </div>
  )
}