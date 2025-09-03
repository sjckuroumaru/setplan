"use client"

import { useState, useEffect } from "react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface Project {
  id: string
  projectNumber: string
  projectName: string
  status: string
}

interface ProjectSelectProps {
  value?: string
  onValueChange?: (value: string) => void
  placeholder?: string
  disabled?: boolean
  className?: string
  required?: boolean
}

export function ProjectSelect({
  value,
  onValueChange,
  placeholder = "案件を選択",
  disabled = false,
  className,
  required = false,
}: ProjectSelectProps) {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchActiveProjects()
  }, [])

  const fetchActiveProjects = async () => {
    try {
      setLoading(true)
      // ステータスが計画中、開発中、稼働中の案件のみ取得（停止中・完了を除外）
      // limitを設定しないことで全件取得
      const response = await fetch("/api/projects?activeOnly=true")
      const data = await response.json()
      
      if (response.ok) {
        setProjects(data.projects || [])
      } else {
        console.error("Failed to fetch projects:", data.error)
      }
    } catch (error) {
      console.error("Failed to fetch projects:", error)
    } finally {
      setLoading(false)
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
            </SelectItem>
          ))
        )}
      </SelectContent>
    </Select>
  )
}