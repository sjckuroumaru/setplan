"use client"

import { useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"

const baseProjectFormSchema = z.object({
  projectNumber: z.string().min(1, "案件番号は必須です"),
  projectName: z.string().min(1, "案件名は必須です"),
  description: z.string().optional(),
  status: z.enum(["planning", "developing", "active", "suspended", "completed"]),
  plannedStartDate: z.string().optional(),
  plannedEndDate: z.string().optional(),
  actualStartDate: z.string().optional(),
  actualEndDate: z.string().optional(),
})

type ProjectFormValues = z.infer<typeof baseProjectFormSchema>

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

interface ProjectFormProps {
  project?: Project
  onSubmit: (data: ProjectFormValues) => Promise<void>
  onCancel: () => void
  isLoading: boolean
  isEdit?: boolean
}

const statusOptions = [
  { value: "planning", label: "計画中" },
  { value: "developing", label: "開発中" },
  { value: "active", label: "稼働中" },
  { value: "suspended", label: "停止中" },
  { value: "completed", label: "完了" },
]

// 日付をYYYY-MM-DD形式に変換
const formatDateForInput = (dateString: string | null) => {
  if (!dateString) return ""
  const date = new Date(dateString)
  return date.toISOString().split("T")[0]
}

export function ProjectForm({ project, onSubmit, onCancel, isLoading, isEdit = false }: ProjectFormProps) {
  const form = useForm<ProjectFormValues>({
    resolver: zodResolver(baseProjectFormSchema),
    defaultValues: {
      projectNumber: project?.projectNumber || "",
      projectName: project?.projectName || "",
      description: project?.description || "",
      status: (project?.status as "planning" | "developing" | "active" | "suspended" | "completed") || "planning",
      plannedStartDate: formatDateForInput(project?.plannedStartDate || null),
      plannedEndDate: formatDateForInput(project?.plannedEndDate || null),
      actualStartDate: formatDateForInput(project?.actualStartDate || null),
      actualEndDate: formatDateForInput(project?.actualEndDate || null),
    },
  })

  useEffect(() => {
    if (project) {
      form.reset({
        projectNumber: project.projectNumber,
        projectName: project.projectName,
        description: project.description || "",
        status: project.status as "planning" | "developing" | "active" | "suspended" | "completed",
        plannedStartDate: formatDateForInput(project.plannedStartDate),
        plannedEndDate: formatDateForInput(project.plannedEndDate),
        actualStartDate: formatDateForInput(project.actualStartDate),
        actualEndDate: formatDateForInput(project.actualEndDate),
      })
    }
  }, [project, form])

  const handleSubmit = async (data: ProjectFormValues) => {
    await onSubmit(data)
  }

  return (
    <Card className="max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>
          {isEdit ? "プロジェクト編集" : "新規プロジェクト作成"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* 基本情報 */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">基本情報</h3>
                
                <FormField
                  control={form.control}
                  name="projectNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>案件番号 *</FormLabel>
                      <FormControl>
                        <Input placeholder="PROJ001" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="projectName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>案件名 *</FormLabel>
                      <FormControl>
                        <Input placeholder="新規システム開発" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>説明</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="プロジェクトの詳細説明..."
                          className="min-h-[100px]"
                          {...field}
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>ステータス *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="ステータスを選択" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {statusOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* 日程情報 */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">日程情報</h3>
                
                <FormField
                  control={form.control}
                  name="plannedStartDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>開始予定日</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} value={field.value || ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="plannedEndDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>終了予定日</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} value={field.value || ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="actualStartDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>実際の開始日</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} value={field.value || ""} />
                      </FormControl>
                      <FormDescription>
                        プロジェクトが実際に開始された日付
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="actualEndDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>実際の終了日</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} value={field.value || ""} />
                      </FormControl>
                      <FormDescription>
                        プロジェクトが実際に終了した日付
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div className="flex justify-end gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={isLoading}
              >
                キャンセル
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading 
                  ? (isEdit ? "更新中..." : "作成中...")
                  : (isEdit ? "更新" : "作成")
                }
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}