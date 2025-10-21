"use client"

import { useState, useEffect, useMemo } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import {
  Gantt,
  Task,
  ViewMode,
  jaDateLocale,
  jaDateFormats,
  TitleColumn,
  DateStartColumn,
  DateEndColumn,
  type Column,
  type ColumnProps,
} from "@sjckuroumaru/gantt-task-react"
import "@sjckuroumaru/gantt-task-react/dist/style.css"
import { useGantt } from "@/hooks/use-gantt"
import { useProjects } from "@/hooks/use-projects"
import { useUsers } from "@/hooks/use-users"
import { useDepartments } from "@/hooks/use-departments"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Plus,
  AlertCircle,
  Calendar,
  User,
  FolderOpen,
  CalendarDays,
} from "lucide-react"

// APIから取得するタスクデータの型定義
interface GanttTaskData extends Task {
  project?: {
    id: string
    projectNumber: string
    projectName: string
  }
  assignee?: {
    id: string
    name: string
    employeeNumber: string
  } | null
  status?: string
  priority?: string
  category?: string
  assigneeName?: string // Display name for the table
}

export default function GanttChartPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.Day)
  const [selectedProject, setSelectedProject] = useState<string>("all")
  const [selectedAssignee, setSelectedAssignee] = useState<string>("all")
  const [selectedDepartment, setSelectedDepartment] = useState<string>("all")
  const [assigneeFilterInitialized, setAssigneeFilterInitialized] = useState(false)
  const [departmentFilterInitialized, setDepartmentFilterInitialized] = useState(false)

  // SWRフックでデータ取得
  const { tasks: rawTasks, isLoading: tasksLoading, isError: tasksError } = useGantt({
    departmentId: selectedDepartment !== "all" ? selectedDepartment : undefined,
    projectId: selectedProject !== "all" ? selectedProject : undefined,
    assigneeId: selectedAssignee !== "all" ? selectedAssignee : undefined,
  })

  const { projects } = useProjects({ page: 1, limit: 1000 })
  const { users: usersData } = useUsers({ limit: 1000, basic: true })
  const { departments } = useDepartments()

  // 担当者リストを整形
  const assignees = usersData.map((user) => ({
    id: user.id,
    name: `${user.lastName} ${user.firstName}`,
    employeeNumber: user.employeeNumber,
  }))

  // タスクの日付変換（useMemoでメモ化）
  const tasks: GanttTaskData[] = useMemo(() => {
    return rawTasks
      .filter((task: any) => {
        // 有効な開始日と終了日を持つタスクのみを含める
        const start = task.start || task.startDate
        const end = task.end || task.endDate

        if (!start || !end) return false

        const startDate = new Date(start)
        const endDate = new Date(end)

        // Invalid Dateをチェック
        return !isNaN(startDate.getTime()) && !isNaN(endDate.getTime())
      })
      .map((task: any) => {
        const start = task.start || task.startDate
        const end = task.end || task.endDate

        return {
          ...task,
          start: new Date(start),
          end: new Date(end),
          name: task.name || task.title,
          type: task.type || 'task' as const,
          assigneeName: task.assignee?.name || (task.assignee?.lastName && task.assignee?.firstName ? `${task.assignee.lastName} ${task.assignee.firstName}` : undefined),
        }
      })
  }, [rawTasks])

  const isLoading = tasksLoading
  const error = tasksError?.message || null

  // 初期フィルター適用（セッション情報のみで即座に初期化）
  useEffect(() => {
    if (session && !departmentFilterInitialized && !assigneeFilterInitialized) {
      // 部署フィルター初期化
      if (session.user.departmentId) {
        setSelectedDepartment(session.user.departmentId)
      }
      setDepartmentFilterInitialized(true)

      // 担当者フィルター初期化
      if (!session.user.isAdmin) {
        setSelectedAssignee(session.user.id)
      }
      setAssigneeFilterInitialized(true)
    }
  }, [session, departmentFilterInitialized, assigneeFilterInitialized])

  const handleTaskClick = (task: Task) => {
    // 課題詳細ページへ遷移
    router.push(`/issues/${task.id}`)
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-96 w-full" />
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{
        __html: `
          @media (max-width: 768px) {
            .gantt-assignee-column {
              display: none !important;
            }
          }
        `
      }} />
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">ガントチャート</h2>
            <p className="text-muted-foreground">
              案件の進捗を視覚的に管理
            </p>
          </div>
        <div className="flex gap-2">
          <Button onClick={() => router.push("/issues/new")} size="sm">
            <Plus className="mr-2 h-4 w-4" />
            新規課題
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>タスク一覧</CardTitle>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2 mt-4">
              <Select value={selectedProject} onValueChange={setSelectedProject}>
                <SelectTrigger className="w-full">
                  <FolderOpen className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="全案件" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全案件</SelectItem>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.projectName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select key={`assignee-${selectedAssignee}`} value={selectedAssignee} onValueChange={setSelectedAssignee}>
                <SelectTrigger className="w-full">
                  <User className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="全担当者" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全担当者</SelectItem>
                  {assignees.map((assignee) => (
                    <SelectItem key={assignee.id} value={assignee.id}>
                      {assignee.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select key={`dept-${selectedDepartment}`} value={selectedDepartment} onValueChange={setSelectedDepartment}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="全部署" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部署</SelectItem>
                  {departments.map((dept) => (
                    <SelectItem key={dept.id} value={dept.id}>
                      {dept.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={viewMode} onValueChange={(value) => setViewMode(value as ViewMode)}>
                <SelectTrigger className="w-full">
                  <CalendarDays className="mr-2 h-4 w-4" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ViewMode.Day}>日</SelectItem>
                  <SelectItem value={ViewMode.Week}>週</SelectItem>
                  <SelectItem value={ViewMode.Month}>月</SelectItem>
                  <SelectItem value={ViewMode.Year}>年</SelectItem>
                </SelectContent>
              </Select>
          </div>
        </CardHeader>
        <CardContent>
          {tasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold">タスクがありません</h3>
              <p className="text-sm text-muted-foreground mt-2">
                ガントチャートに表示するには、課題に開始日と終了日を設定してください
              </p>
              <Button 
                onClick={() => router.push("/issues")} 
                variant="outline" 
                className="mt-4"
              >
                課題管理へ
              </Button>
            </div>
          ) : (
            <div className="gantt-container">
              <Gantt
                tasks={tasks}
                viewMode={viewMode}
                dateLocale={jaDateLocale}
                dateFormats={jaDateFormats}
                TaskListHeader={({ headerHeight }) => (
                  <div
                    style={{
                      height: headerHeight + 4,
                      display: "grid",
                      gridTemplateColumns: "150px 200px 100px 60px 90px 90px",
                      alignItems: "center",
                      borderBottom: "1px solid #e2e8f0",
                      fontWeight: 600,
                      fontSize: "13px",
                      backgroundColor: "white",
                    }}
                  >
                    <div style={{ paddingLeft: "16px" }}>案件名</div>
                    <div style={{ paddingLeft: "8px" }}>課題名</div>
                    <div className="gantt-assignee-column" style={{ paddingLeft: "8px" }}>担当者</div>
                    <div style={{ paddingLeft: "8px" }}>進捗</div>
                    <div style={{ paddingLeft: "8px" }}>開始日</div>
                    <div style={{ paddingLeft: "8px" }}>終了日</div>
                  </div>
                )}
                TaskListTable={({ tasks: ganttTasks }) => {
                  return (
                    <>
                      {ganttTasks.map((task) => {
                        const taskData = tasks.find(t => t.id === task.id) as GanttTaskData
                        return (
                          <div
                            key={task.id}
                            style={{
                              display: "grid",
                              gridTemplateColumns: "150px 200px 100px 60px 90px 90px",
                              alignItems: "center",
                              height: "51px",
                              borderBottom: "1px solid #e2e8f0",
                              cursor: "pointer",
                              fontSize: "13px",
                              backgroundColor: "white",
                            }}
                            onClick={() => task.type !== "empty" && handleTaskClick(task as Task)}
                          >
                            <div 
                              className="truncate"
                              style={{
                                paddingLeft: "16px",
                                paddingRight: "8px",
                              }}
                            >
                              {taskData?.project?.projectName || "-"}
                            </div>
                            <div 
                              className="flex items-center gap-2 min-w-0"
                              style={{
                                paddingLeft: "8px",
                              }}
                            >
                              <span className="truncate pr-2">{task.name}</span>
                              {taskData?.priority === "high" && (
                                <Badge variant="destructive" className="text-xs h-5 flex-shrink-0">高</Badge>
                              )}
                              {taskData?.priority === "critical" && (
                                <Badge variant="destructive" className="text-xs h-5 flex-shrink-0">緊急</Badge>
                              )}
                            </div>
                            <div className="gantt-assignee-column truncate" style={{ paddingLeft: "8px" }}>
                              {taskData?.assignee?.name || "-"}
                            </div>
                            <div style={{ paddingLeft: "8px" }} className="text-sm font-medium">
                              {task.type !== "empty" ? (task as Task).progress || 0 : 0}%
                            </div>
                            <div style={{ paddingLeft: "8px" }}>
                              {taskData?.start && !isNaN(new Date(taskData.start).getTime())
                                ? new Date(taskData.start).toLocaleDateString("ja-JP", { month: "2-digit", day: "2-digit" })
                                : "-"}
                            </div>
                            <div style={{ paddingLeft: "8px" }}>
                              {taskData?.end && !isNaN(new Date(taskData.end).getTime())
                                ? new Date(taskData.end).toLocaleDateString("ja-JP", { month: "2-digit", day: "2-digit" })
                                : "-"}
                            </div>
                          </div>
                        )
                      })}
                    </>
                  )
                }}
              />
            </div>
          )}
        </CardContent>
      </Card>

      </div>
    </>
  )
}