"use client"

import { useState, useEffect, useCallback, use, useRef } from "react"
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
  departmentId: string | null
  departmentRef?: {
    id: string
    name: string
  } | null
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
  departmentId?: string | null
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
  const isAdmin = session?.user?.isAdmin ?? false
  const hasFetchedUser = useRef(false)
  const previousUserId = useRef<string | null>(null)

  // 権限チェック（管理者または自分自身のプロフィールのみアクセス可能）
  useEffect(() => {
    if (status === "loading") return

    if (!session) {
      router.push("/login")
      return
    }

    const isOwnProfile = session.user?.id === id
    if (!session.user?.isAdmin && !isOwnProfile) {
      router.push("/dashboard")
      return
    }
  }, [session, status, router, id])

  // ユーザー情報取得
  const fetchUser = useCallback(async () => {
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
  }, [id])

  useEffect(() => {
    if (status !== "authenticated") {
      return
    }

    const isOwnProfile = session?.user?.id === id
    if (!isAdmin && !isOwnProfile) {
      return
    }

    if (previousUserId.current !== id) {
      hasFetchedUser.current = false
      previousUserId.current = id
    }

    if (hasFetchedUser.current) {
      return
    }

    hasFetchedUser.current = true
    fetchUser()
  }, [status, isAdmin, id, fetchUser, session?.user?.id])

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
        // エラーが配列の場合、各エラーオブジェクトからメッセージを抽出
        let errorMessage = "ユーザーの更新に失敗しました"
        if (Array.isArray(result.error)) {
          errorMessage = result.error.map((err: any) => err.message).join(", ")
        } else if (typeof result.error === "string") {
          errorMessage = result.error
        }
        throw new Error(errorMessage)
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

  const isOwnProfile = session?.user?.id === id
  const hasAccess = isAdmin || isOwnProfile

  if (status === "loading" || !hasAccess || loading) {
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
          isAdmin={isAdmin}
        />
      )}
    </div>
  )
}
