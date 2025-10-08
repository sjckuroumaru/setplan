"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter, useParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"
import { ArrowLeft, AlertCircle } from "lucide-react"
import { DepartmentForm } from "@/components/features/departments/department-form"
import { toast } from "sonner"

interface Department {
  id: string
  name: string
  createdAt: string
  updatedAt: string
}

type DepartmentFormValues = {
  name: string
}

export default function EditDepartmentPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const params = useParams()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [department, setDepartment] = useState<Department | null>(null)
  const [fetching, setFetching] = useState(true)

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

  // 部署情報取得
  useEffect(() => {
    const fetchDepartment = async () => {
      try {
        const response = await fetch(`/api/departments/${params.id}`)
        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || "部署情報の取得に失敗しました")
        }

        setDepartment(data.department)
      } catch (error) {
        console.warn("Fetch department error:", error)
        const errorMessage = error instanceof Error ? error.message : "エラーが発生しました"
        setError(errorMessage)
        toast.error(errorMessage)
      } finally {
        setFetching(false)
      }
    }

    if (session?.user?.isAdmin) {
      fetchDepartment()
    }
  }, [session, params.id])

  const handleSubmit = async (data: DepartmentFormValues) => {
    try {
      setIsLoading(true)
      setError("")

      const response = await fetch(`/api/departments/${params.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "部署の更新に失敗しました")
      }

      toast.success("部署・チームを更新しました")
      router.push("/settings/departments")
    } catch (error) {
      console.warn("Update department error:", error)
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

  if (status === "loading" || !session?.user?.isAdmin || fetching) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-[400px]" />
      </div>
    )
  }

  if (!department) {
    return (
      <div className="space-y-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>部署が見つかりません</AlertDescription>
        </Alert>
        <Button asChild>
          <Link href="/settings/departments">
            <ArrowLeft className="mr-2 h-4 w-4" />
            部署一覧に戻る
          </Link>
        </Button>
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
          <h2 className="text-3xl font-bold tracking-tight">部署・チーム編集</h2>
          <p className="text-muted-foreground">
            部署・チーム情報を編集します
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
        department={department}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        isLoading={isLoading}
        isEdit={true}
      />
    </div>
  )
}
