"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"
import { ArrowLeft, AlertCircle } from "lucide-react"
import { DepartmentForm } from "@/components/features/departments/department-form"
import { toast } from "sonner"

type DepartmentFormValues = {
  name: string
}

export default function NewDepartmentPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")

  // 管理者権限チェック
  useEffect(() => {
    if (status === "loading") return

    if (!session) {
      router.push("/login")
      return
    }

    if (!session.user?.isAdmin) {
      router.push("/dashboard")
      return
    }
  }, [session, status, router])

  const handleSubmit = async (data: DepartmentFormValues) => {
    try {
      setIsLoading(true)
      setError("")

      const response = await fetch("/api/departments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "部署の作成に失敗しました")
      }

      toast.success("部署・チームを作成しました")
      router.push("/settings/departments")
    } catch (error) {
      console.warn("Create department error:", error)
      const errorMessage = error instanceof Error ? error.message : "エラーが発生しました"
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancel = () => {
    router.push("/settings/departments")
  }

  if (status === "loading" || !session?.user?.isAdmin) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-[400px]" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/settings/departments">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h2 className="text-3xl font-bold tracking-tight">新規部署・チーム作成</h2>
          <p className="text-muted-foreground">
            新しい部署・チームを登録します
          </p>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <DepartmentForm
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        isLoading={isLoading}
        isEdit={false}
      />
    </div>
  )
}
