"use client"

import { useState, useEffect, use } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"
import { ArrowLeft, AlertCircle } from "lucide-react"
import { ProjectForm } from "@/components/features/projects/project-form"
import { toast } from "sonner"

interface Project {
  id: string
  projectNumber: string
  projectName: string
  description: string | null
  status: string
  plannedStartDate: string | null
  plannedEndDate: string | null
  actualStartDate: string | null
  actualEndDate: string | null
  createdAt: string
  updatedAt: string
}

type ProjectFormValues = {
  projectNumber: string
  projectName: string
  description?: string
  status: "planning" | "developing" | "active" | "suspended" | "completed"
  plannedStartDate?: string
  plannedEndDate?: string
  actualStartDate?: string
  actualEndDate?: string
}

export default function EditProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { data: session, status } = useSession()
  const router = useRouter()
  const [project, setProject] = useState<Project | null>(null)
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

  // プロジェクト情報取得
  const fetchProject = async () => {
    try {
      setLoading(true)
      setError("")

      const response = await fetch(`/api/projects/${id}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "プロジェクト情報の取得に失敗しました")
      }

      setProject(data.project)
    } catch (error) {
      console.warn("Fetch project error:", error)
      setError(error instanceof Error ? error.message : "エラーが発生しました")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (session?.user?.isAdmin) {
      fetchProject()
    }
  }, [session, id])

  const handleSubmit = async (data: ProjectFormValues) => {
    try {
      setIsLoading(true)
      setError("")

      const response = await fetch(`/api/projects/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "プロジェクトの更新に失敗しました")
      }

      toast.success("プロジェクト情報を更新しました")
      router.push("/projects")
    } catch (error) {
      console.warn("Update project error:", error)
      const errorMessage = error instanceof Error ? error.message : "エラーが発生しました"
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancel = () => {
    router.push("/projects")
  }

  if (status === "loading" || !session?.user?.isAdmin || loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-[600px]" />
      </div>
    )
  }

  if (error && !project) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/projects">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h2 className="text-3xl font-bold tracking-tight">プロジェクト編集</h2>
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
          <Link href="/projects">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h2 className="text-3xl font-bold tracking-tight">プロジェクト編集</h2>
          <p className="text-muted-foreground">
            {project ? `${project.projectName}の情報を編集` : "プロジェクト情報を編集"}
          </p>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {project && (
        <ProjectForm
          project={project}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          isLoading={isLoading}
          isEdit={true}
        />
      )}
    </div>
  )
}