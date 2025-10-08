"use client"

import { useState, useEffect } from "react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export interface Project {
  id: string
  projectNumber: string
  projectName: string
  status: string
  departmentRef?: {
    id: string
    name: string
  } | null
}

interface ProjectSelectProps {
  value?: string
  onValueChange?: (value: string) => void
  placeholder?: string
  disabled?: boolean
  className?: string
  required?: boolean
  projects?: Project[] // 親コンポーネントからプロジェクトリストを渡す場合
  loading?: boolean // 親コンポーネントでのローディング状態
}

export function ProjectSelect({
  value,
  onValueChange,
  placeholder = "案件を選択",
  disabled = false,
  className,
  required = false,
  projects: externalProjects,
  loading: externalLoading,
}: ProjectSelectProps) {
  const [internalProjects, setInternalProjects] = useState<Project[]>([])
  const [internalLoading, setInternalLoading] = useState(true)

  // 外部からprojectsが渡されている場合はそれを使用、なければ自分でfetch
  const projects = externalProjects ?? internalProjects
  const loading = externalLoading ?? (externalProjects ? false : internalLoading)

  useEffect(() => {
    // 外部からprojectsが渡されている場合はfetchしない
    if (externalProjects === undefined) {
      fetchActiveProjects()
    }
  }, [externalProjects])

  const fetchActiveProjects = async () => {
    try {
      setInternalLoading(true)
      // ステータスが計画中、開発中、稼働中の案件のみ取得（停止中・完了を除外）
      // limitを設定しないことで全件取得
      const response = await fetch("/api/projects?activeOnly=true")
      const data = await response.json()

      if (response.ok) {
        setInternalProjects(data.projects || [])
      } else {
        console.error("Failed to fetch projects:", data.error)
      }
    } catch (error) {
      console.error("Failed to fetch projects:", error)
    } finally {
      setInternalLoading(false)
    }
  }

  return (
    <Select 
      value={value} 
      onValueChange={onValueChange} 
      disabled={disabled || loading}
      required={required}
    >
      <SelectTrigger className={className}>
        <SelectValue placeholder={loading ? "読み込み中..." : placeholder} />
      </SelectTrigger>
      <SelectContent>
        {projects.length === 0 ? (
          <SelectItem value="_no_projects" disabled>
            利用可能な案件がありません
          </SelectItem>
        ) : (
          projects.map((project) => (
            <SelectItem key={project.id} value={project.id}>
              {project.projectNumber} - {project.projectName}
              {project.departmentRef && (
                <span className="text-xs text-muted-foreground ml-2">
                  ({project.departmentRef.name})
                </span>
              )}
            </SelectItem>
          ))
        )}
      </SelectContent>
    </Select>
  )
}