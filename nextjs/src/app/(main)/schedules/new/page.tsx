"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"
import { ArrowLeft, AlertCircle } from "lucide-react"
import { ScheduleForm } from "@/components/features/schedules/schedule-form"
import { toast } from "sonner"

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

type ScheduleFormValues = {
  scheduleDate: string
  checkInTime?: string
  checkOutTime?: string
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

export default function NewSchedulePage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [showAllProjects, setShowAllProjects] = useState(false)

  // 認証チェック
  useEffect(() => {
    if (status === "loading") return
    
    if (!session) {
      router.push("/login")
      return
    }
  }, [session, status, router])

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
        throw new Error(result.error || "予定実績の登録に失敗しました")
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

  if (status === "loading" || !session) {
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