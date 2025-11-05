"use client"

import { useState, useEffect, Suspense } from "react"
import { useSession } from "next-auth/react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"
import { ArrowLeft, AlertCircle } from "lucide-react"
import { ScheduleForm } from "@/components/features/schedules/schedule-form"
import { toast } from "sonner"

type ScheduleFormValues = {
  scheduleDate: string
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


function NewSchedulePageContent() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [showAllProjects, setShowAllProjects] = useState(false)
  const [duplicateSchedule, setDuplicateSchedule] = useState<any>(null)
  const [isDuplicateLoading, setIsDuplicateLoading] = useState(false)

  // 認証チェック
  useEffect(() => {
    if (status === "loading") return

    if (!session) {
      router.push("/login")
      return
    }
  }, [session, status, router])

  // 複製データの読み込み
  useEffect(() => {
    const duplicateId = searchParams.get('duplicateId')

    if (duplicateId && session) {
      setIsDuplicateLoading(true)

      fetch(`/api/schedules/${duplicateId}`)
        .then(async (response) => {
          if (!response.ok) {
            throw new Error('Failed to fetch schedule for duplication')
          }
          return response.json()
        })
        .then((data) => {
          // 今日の日付を取得
          const today = new Date()
          const year = today.getFullYear()
          const month = String(today.getMonth() + 1).padStart(2, '0')
          const day = String(today.getDate()).padStart(2, '0')
          const todayStr = `${year}-${month}-${day}`

          // 複製用データを作成（IDと退社時間と所感を除外、日付は今日に設定）
          const duplicateData = {
            scheduleDate: todayStr,
            checkInTime: data.schedule.checkInTime,
            checkOutTime: null, // 退社時間は空欄
            breakTime: data.schedule.breakTime ?? 1.0, // 休憩時間をコピー、nullの場合は1.0
            reflection: null, // 所感も空欄
            plans: data.schedule.plans || [],
            actuals: data.schedule.actuals || [],
          }

          setDuplicateSchedule(duplicateData)
          setIsDuplicateLoading(false)
        })
        .catch((error) => {
          console.warn('Failed to load schedule for duplication:', error)
          setIsDuplicateLoading(false)
          toast.error('複製元のデータの読み込みに失敗しました')
        })
    }
  }, [searchParams, session])

  const handleSubmit = async (data: ScheduleFormValues) => {
    try {
      setIsLoading(true)
      setError("")

      const response = await fetch("/api/schedules", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      })

      const result = await response.json()

      if (!response.ok) {
        // エラーメッセージの処理
        let errorMessage = "予定実績の登録に失敗しました"

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

      toast.success("予定実績を登録しました")
      router.push("/schedules")
    } catch (error) {
      console.warn("Create schedule error:", error)
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

  if (status === "loading" || !session || isDuplicateLoading) {
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
              <h2 className="text-3xl font-bold tracking-tight">新規予定実績登録</h2>
              <p className="text-muted-foreground">
                新しい予定実績を登録します
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

        <ScheduleForm
          schedule={duplicateSchedule}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          isLoading={isLoading}
          isEdit={false}
          showAllProjects={showAllProjects}
          setShowAllProjects={setShowAllProjects}
        />
    </div>
  )
}

export default function NewSchedulePage() {
  return (
    <Suspense fallback={
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-[600px]" />
      </div>
    }>
      <NewSchedulePageContent />
    </Suspense>
  )
}