"use client"

import { useEffect, useState } from "react"
import { useForm, useFieldArray } from "react-hook-form"
import { useSession } from "next-auth/react"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { ProjectSelect, Project } from "@/components/ui/project-select"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Plus, Trash2, Clock, FileText } from "lucide-react"

// バリデーションスキーマ
const planSchema = z.object({
  projectId: z.string().optional(),
  content: z.string().min(1, "予定内容は必須です"),
  details: z.string().optional(),
})

const actualSchema = z.object({
  projectId: z.string().optional(),
  content: z.string(),
  hours: z.number().min(0, "実績時間は0以上で入力してください"),
  details: z.string().optional(),
}).refine((data) => {
  // 案件が「案件なし」以外の場合は実績内容が必須
  if (data.projectId && data.projectId !== "none") {
    return data.content.trim().length > 0
  }
  return true
}, {
  message: "案件を選択した場合は実績内容が必須です",
  path: ["content"]
}).refine((data) => {
  // 案件が「案件なし」以外の場合は実績時間が必須（0より大きい）
  if (data.projectId && data.projectId !== "none") {
    return data.hours > 0
  }
  return true
}, {
  message: "案件を選択した場合は実績時間が必須です",
  path: ["hours"]
})

const scheduleFormSchema = z.object({
  scheduleDate: z.string().min(1, "日付は必須です"),
  checkInTime: z.string().optional(),
  checkOutTime: z.string().optional(),
  reflection: z.string().optional(),
  plans: z.array(planSchema),
  actuals: z.array(actualSchema),
  userId: z.string().optional(),
})

type ScheduleFormValues = z.infer<typeof scheduleFormSchema>

interface Schedule {
  id: string
  userId: string
  scheduleDate: string
  checkInTime: string | null
  checkOutTime: string | null
  reflection: string | null
  plans: Array<{
    id: string
    projectId: string | null
    content: string
    details: string | null
    project?: Project
  }>
  actuals: Array<{
    id: string
    projectId: string | null
    content: string
    hours: number
    details: string | null
    project?: Project
  }>
}

interface User {
  id: string
  employeeNumber: string
  lastName: string
  firstName: string
}

interface ScheduleFormProps {
  schedule?: Schedule
  onSubmit: (data: ScheduleFormValues) => Promise<void>
  onCancel: () => void
  isLoading: boolean
  isEdit?: boolean
  readOnly?: boolean
  isAdmin?: boolean
  users?: User[]
  showAllProjects?: boolean
  setShowAllProjects?: (value: boolean) => void
}

// 日付をYYYY-MM-DD形式に変換
const formatDateForInput = (dateString: string | null) => {
  if (!dateString) return ""
  const date = new Date(dateString)
  return date.toISOString().split("T")[0]
}

// 15分単位の時刻オプションを生成
const generateTimeOptions = () => {
  const options = []
  for (let hour = 6; hour <= 23; hour++) {
    for (let minute = 0; minute < 60; minute += 15) {
      const hourStr = hour.toString().padStart(2, "0")
      const minuteStr = minute.toString().padStart(2, "0")
      const timeValue = `${hourStr}:${minuteStr}`
      options.push({ value: timeValue, label: timeValue })
    }
  }
  return options
}

const TIME_OPTIONS = generateTimeOptions()

export function ScheduleForm({ schedule, onSubmit, onCancel, isLoading, isEdit = false, readOnly = false, isAdmin = false, users = [], showAllProjects = false, setShowAllProjects }: ScheduleFormProps) {
  const { data: session } = useSession()
  const [projects, setProjects] = useState<Project[]>([])
  const [projectsLoading, setProjectsLoading] = useState(true)
  const [currentTime, setCurrentTime] = useState("")
  const [todayDate, setTodayDate] = useState("")

  // 現在の日時を取得（クライアント側のみ）
  useEffect(() => {
    const now = new Date()
    const currentHour = now.getHours().toString().padStart(2, "0")
    const currentMinute = (Math.floor(now.getMinutes() / 15) * 15).toString().padStart(2, "0")
    setCurrentTime(`${currentHour}:${currentMinute}`)
    setTodayDate(now.toISOString().split("T")[0])
  }, [])

  // プロジェクトリストを取得
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        setProjectsLoading(true)

        // URLパラメータを構築
        const params = new URLSearchParams({ activeOnly: "true" })

        // showAllProjectsがfalseで、かつユーザーにdepartmentIdがある場合、部署フィルタを適用
        if (!showAllProjects && session?.user?.departmentId) {
          params.append("departmentId", session.user.departmentId)
        }

        const response = await fetch(`/api/projects?${params}`)
        const data = await response.json()

        if (response.ok) {
          setProjects(data.projects || [])
        } else {
          console.error("Failed to fetch projects:", data.error)
        }
      } catch (error) {
        console.error("Failed to fetch projects:", error)
      } finally {
        setProjectsLoading(false)
      }
    }

    if (session) {
      fetchProjects()
    }
  }, [showAllProjects, session])

  const form = useForm<ScheduleFormValues>({
    resolver: zodResolver(scheduleFormSchema),
    defaultValues: {
      scheduleDate: schedule ? formatDateForInput(schedule.scheduleDate) : todayDate,
      checkInTime: schedule?.checkInTime || (isEdit ? "none" : currentTime),
      checkOutTime: schedule?.checkOutTime || "none",
      reflection: schedule?.reflection || "",
      userId: schedule?.userId || undefined,
      plans: schedule?.plans?.map(plan => ({
        projectId: plan.projectId || "none",
        content: plan.content,
        details: plan.details || "",
      })) || [{ projectId: "none", content: "", details: "" }],
      actuals: schedule?.actuals?.map(actual => ({
        projectId: actual.projectId || "none",
        content: actual.content,
        hours: actual.hours,
        details: actual.details || "",
      })) || [{ projectId: "none", content: "", hours: 0, details: "" }],
    },
  })

  const { fields: planFields, append: appendPlan, remove: removePlan } = useFieldArray({
    control: form.control,
    name: "plans",
  })

  const { fields: actualFields, append: appendActual, remove: removeActual } = useFieldArray({
    control: form.control,
    name: "actuals",
  })

  // 実績時間の合計を計算（リアルタイム）
  const watchActuals = form.watch("actuals")
  const totalHours = watchActuals?.reduce((sum, actual) => sum + (Number(actual.hours) || 0), 0) || 0

  useEffect(() => {
    if (schedule) {
      form.reset({
        scheduleDate: formatDateForInput(schedule.scheduleDate),
        checkInTime: schedule.checkInTime || "none",
        checkOutTime: schedule.checkOutTime || "none",
        reflection: schedule.reflection || "",
        userId: schedule.userId || undefined,
        plans: schedule.plans?.map(plan => ({
          projectId: plan.projectId || "none",
          content: plan.content,
          details: plan.details || "",
        })) || [{ projectId: "none", content: "", details: "" }],
        actuals: schedule.actuals?.map(actual => ({
          projectId: actual.projectId || "none",
          content: actual.content,
          hours: actual.hours,
          details: actual.details || "",
        })) || [{ projectId: "none", content: "", hours: 0, details: "" }],
      })
    }
  }, [schedule, form])

  const handleSubmit = async (data: ScheduleFormValues) => {
    // 空の項目を除外し、"none"を空文字列に変換
    const filteredData = {
      ...data,
      checkInTime: data.checkInTime === "none" ? undefined : data.checkInTime,
      checkOutTime: data.checkOutTime === "none" ? undefined : data.checkOutTime,
      plans: data.plans
        .filter(plan => plan.content.trim() !== "")
        .map(plan => ({
          ...plan,
          projectId: plan.projectId === "none" ? undefined : plan.projectId
        })),
      actuals: data.actuals
        .filter(actual => actual.content.trim() !== "")
        .map(actual => ({
          ...actual,
          projectId: actual.projectId === "none" ? undefined : actual.projectId
        })),
    }
    await onSubmit(filteredData)
  }

  return (
    <Card className="max-w-6xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          {readOnly ? "予定実績詳細（閲覧専用）" : (isEdit ? "予定実績編集" : "新規予定実績登録")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-8">
            {/* 基本情報 */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">基本情報</h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="scheduleDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>日付 *</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} disabled={readOnly} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* ユーザー選択（管理者のみ） */}
                {isAdmin && users && users.length > 0 && (
                  <FormField
                    control={form.control}
                    name="userId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>担当者</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value} disabled={readOnly}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="担当者を選択" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {users.map((user) => (
                              <SelectItem key={user.id} value={user.id}>
                                {user.lastName} {user.firstName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                <FormField
                  control={form.control}
                  name="checkInTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>出社時刻</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ""} disabled={readOnly}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="出社時刻を選択" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">選択なし</SelectItem>
                          {TIME_OPTIONS.map((option) => (
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

                <FormField
                  control={form.control}
                  name="checkOutTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>退社時刻</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ""} disabled={readOnly}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="退社時刻を選択" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">選択なし</SelectItem>
                          {TIME_OPTIONS.map((option) => (
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
            </div>

            <Separator />

            {/* 予定情報 */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">予定情報</h3>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => appendPlan({ projectId: "none", content: "", details: "" })}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  予定を追加
                </Button>
              </div>

              {planFields.map((field, index) => (
                <Card key={field.id} className="p-4">
                  <div className="flex items-start gap-4">
                    <div className="flex-1 space-y-4">
                      <FormField
                        control={form.control}
                        name={`plans.${index}.projectId`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>案件</FormLabel>
                            <FormControl>
                              <ProjectSelect
                                value={field.value || ""}
                                onValueChange={field.onChange}
                                placeholder="案件を選択（オプション）"
                                disabled={readOnly}
                                projects={projects}
                                loading={projectsLoading}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name={`plans.${index}.content`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>予定内容 *</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="例: 定例会議"
                                className="min-h-[120px]"
                                {...field}
                                disabled={readOnly}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name={`plans.${index}.details`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>備考</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="備考..."
                                {...field}
                                value={field.value || ""}
                                disabled={readOnly}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {planFields.length > 1 && !readOnly && (
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => removePlan(index)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </Card>
              ))}
            </div>

            <Separator />

            {/* 実績情報 */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <h3 className="text-lg font-medium">実績情報</h3>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    合計時間: {totalHours.toFixed(2)}h
                  </div>
                </div>
                {!readOnly && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => appendActual({ projectId: "none", content: "", hours: 0, details: "" })}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    実績を追加
                  </Button>
                )}
              </div>

              {actualFields.map((field, index) => (
                <Card key={field.id} className="p-4">
                  <div className="flex items-start gap-4">
                    <div className="flex-1 space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-4">
                        <FormField
                          control={form.control}
                          name={`actuals.${index}.projectId`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>案件</FormLabel>
                              <FormControl>
                                <ProjectSelect
                                  value={field.value || ""}
                                  onValueChange={field.onChange}
                                  placeholder="案件を選択（オプション）"
                                  disabled={readOnly}
                                  projects={projects}
                                  loading={projectsLoading}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name={`actuals.${index}.hours`}
                          render={({ field }) => {
                            const currentProjectId = form.watch(`actuals.${index}.projectId`)
                            const isRequired = currentProjectId && currentProjectId !== "none"
                            return (
                              <FormItem>
                                <FormLabel>実績時間{isRequired ? " *" : ""}</FormLabel>
                                <FormControl>
                                  <Input
                                    type="number"
                                    step="0.25"
                                    min="0"
                                    placeholder="2.5"
                                    className="w-24"
                                    {...field}
                                    onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                    disabled={readOnly}
                                  />
                                </FormControl>
                                <FormDescription>
                                  時間単位で入力（0.25時間刻み）
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )
                          }}
                        />
                      </div>

                      <FormField
                        control={form.control}
                        name={`actuals.${index}.content`}
                        render={({ field }) => {
                          const currentProjectId = form.watch(`actuals.${index}.projectId`)
                          const isRequired = currentProjectId && currentProjectId !== "none"
                          return (
                            <FormItem>
                              <FormLabel>実績内容{isRequired ? " *" : ""}</FormLabel>
                              <FormControl>
                                <Textarea
                                  placeholder="例: 資料作成"
                                  className="min-h-[120px]"
                                  {...field}
                                  disabled={readOnly}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )
                        }}
                      />

                      <FormField
                        control={form.control}
                        name={`actuals.${index}.details`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>備考</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="備考..."
                                {...field}
                                value={field.value || ""}
                                disabled={readOnly}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {actualFields.length > 1 && !readOnly && (
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => removeActual(index)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </Card>
              ))}
            </div>

            <Separator />

            {/* 所感 */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">所感</h3>
              
              <FormField
                control={form.control}
                name="reflection"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>一日の振り返り・コメント</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="今日の業務についての所感や気づき..."
                        className="min-h-[100px]"
                        {...field}
                        value={field.value || ""}
                        disabled={readOnly}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* アクションボタン */}
            <div className="flex justify-end gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={isLoading}
              >
                {readOnly ? "戻る" : "キャンセル"}
              </Button>
              {!readOnly && (
                <Button type="submit" disabled={isLoading}>
                  {isLoading 
                    ? (isEdit ? "更新中..." : "登録中...")
                    : (isEdit ? "更新" : "登録")
                  }
                </Button>
              )}
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}