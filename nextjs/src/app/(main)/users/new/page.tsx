"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"
import { ArrowLeft, AlertCircle } from "lucide-react"
import { UserForm } from "@/components/features/users/user-form"
import { toast } from "sonner"

type UserFormValues = {
  employeeNumber: string
  username: string
  email: string
  password?: string
  lastName: string
  firstName: string
  department?: string
  isAdmin: boolean
  status: "active" | "inactive"
}

export default function NewUserPage() {
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

  const handleSubmit = async (data: UserFormValues) => {
    try {
      setIsLoading(true)
      setError("")

      const response = await fetch("/api/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "ユーザーの作成に失敗しました")
      }

      toast.success("ユーザーを作成しました")
      router.push("/users")
    } catch (error) {
      console.warn("Create user error:", error)
      const errorMessage = error instanceof Error ? error.message : "エラーが発生しました"
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancel = () => {
    router.push("/users")
  }

  if (status === "loading" || !session?.user?.isAdmin) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-[600px]" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/users">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h2 className="text-3xl font-bold tracking-tight">新規ユーザー作成</h2>
          <p className="text-muted-foreground">
            新しいユーザーアカウントを作成します
          </p>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <UserForm
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        isLoading={isLoading}
        isEdit={false}
      />
    </div>
  )
}