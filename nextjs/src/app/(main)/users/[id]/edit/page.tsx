"use client"

import { useState, useEffect, use } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"
import { ArrowLeft, AlertCircle } from "lucide-react"
import { UserForm } from "@/components/features/users/user-form"
import { toast } from "sonner"

interface User {
  id: string
  employeeNumber: string
  username: string
  email: string
  lastName: string
  firstName: string
  department: string | null
  isAdmin: boolean
  status: string
  createdAt: string
  updatedAt: string
}

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

export default function EditUserPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { data: session, status } = useSession()
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [loading, setLoading] = useState(true)
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

  // ユーザー情報取得
  const fetchUser = async () => {
    try {
      setLoading(true)
      setError("")

      const response = await fetch(`/api/users/${id}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "ユーザー情報の取得に失敗しました")
      }

      setUser(data.user)
    } catch (error) {
      console.warn("Fetch user error:", error)
      setError(error instanceof Error ? error.message : "エラーが発生しました")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (session?.user?.isAdmin) {
      fetchUser()
    }
  }, [session, id])

  const handleSubmit = async (data: UserFormValues) => {
    try {
      setIsLoading(true)
      setError("")

      const response = await fetch(`/api/users/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "ユーザーの更新に失敗しました")
      }

      toast.success("ユーザー情報を更新しました")
      router.push("/users")
    } catch (error) {
      console.warn("Update user error:", error)
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

  if (status === "loading" || !session?.user?.isAdmin || loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-[600px]" />
      </div>
    )
  }

  if (error && !user) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/users">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h2 className="text-3xl font-bold tracking-tight">ユーザー編集</h2>
            <p className="text-muted-foreground">エラーが発生しました</p>
          </div>
        </div>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
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
          <h2 className="text-3xl font-bold tracking-tight">ユーザー編集</h2>
          <p className="text-muted-foreground">
            {user ? `${user.lastName} ${user.firstName}さんの情報を編集` : "ユーザー情報を編集"}
          </p>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {user && (
        <UserForm
          user={user}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          isLoading={isLoading}
          isEdit={true}
        />
      )}
    </div>
  )
}