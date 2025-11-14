"use client"

import { useEffect, useMemo, useRef } from "react"
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
import { useActiveProjects } from "@/hooks/use-active-projects"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Plus, Trash2, Clock, FileText, Copy } from "lucide-react"

// バリデーションスキーマ
const planSchema = z.object({
  projectId: z.string().optional(),
  content: z.string().max(500, "予定内容は500文字以内で入力してください").optional(),
  details: z.string().optional(),
})

const actualSchema = z.object({
  hours: z.number().min(0, "実績時間は0以上で入力してください"),
  projectId: z.string().optional(),
  content: z.string()
    .max(500, "実績内容は500文字以内で入力してください")
    .trim()
    .optional(),
  details: z.string().optional(),
})

const scheduleFormSchema = z.object({
  scheduleDate: z.string().min(1, "日付は必須です"),
  checkInTime: z.string().nullable().optional(),
  checkOutTime: z.string().nullable().optional(),
  breakTime: z.number().min(0, "休憩時間は0以上で入力してください").max(24, "休憩時間は24時間以内で入力してください").optional(),
  workLocation: z.union([
    z.enum(["office", "remote", "client_site", "business_trip", "paid_leave"]),
    z.null(),
    z.undefined()
  ]).refine((val) => val !== null && val !== undefined, {
    message: "勤務形態を選択してください"
  }),
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
  breakTime: number | null
  workLocation: "office" | "remote" | "client_site" | "business_trip" | "paid_leave" | null
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

const workLocationOptions = [
  { value: "office", label: "出社" },
  { value: "remote", label: "在宅" },
  { value: "client_site", label: "客先常駐" },
  { value: "business_trip", label: "外出" },
  { value: "paid_leave", label: "有給休暇" },
]

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

export function ScheduleForm({ schedule, onSubmit, onCancel, isLoading, isEdit = false, readOnly = false, isAdmin = false, users = [], showAllProjects = false }: ScheduleFormProps) {
  const { projects, isLoading: projectsLoading } = useActiveProjects({ showAllProjects })

  // データ設定済みフラグと前回のスケジュールID
  const hasInitializedData = useRef(false)
  const previousScheduleKey = useRef<string | null>(null)
  const formId = useMemo(() => `schedule-form-${schedule?.id ?? "new"}`, [schedule?.id])

  // 新規作成時の初期値を計算
  const defaultFormValues = useMemo(() => {
    if (schedule) {
      // 編集モードの場合は既存データを使用
      return {
        scheduleDate: formatDateForInput(schedule.scheduleDate),
        checkInTime: schedule.checkInTime || "none",
        checkOutTime: schedule.checkOutTime || "none",
        breakTime: schedule.breakTime ?? undefined,
        workLocation: schedule.workLocation ?? undefined,
        reflection: schedule.reflection || "",
        userId: schedule.userId || undefined,
        plans: schedule.plans && schedule.plans.length > 0
          ? schedule.plans.map(plan => ({
              projectId: plan.projectId || "none",
              content: plan.content,
              details: plan.details || "",
            }))
          : [{ projectId: "none", content: "", details: "" }],
        actuals: schedule.actuals && schedule.actuals.length > 0
          ? schedule.actuals.map(actual => ({
              projectId: actual.projectId || "none",
              content: actual.content,
              hours: actual.hours,
              details: actual.details || "",
            }))
          : [{ projectId: "none", content: "", hours: 0, details: "" }],
      }
    }

    // 新規作成モードの場合は現在日時を使用
    const now = new Date()

    // 現在時刻を15分単位で切り上げ
    const totalMinutes = now.getHours() * 60 + now.getMinutes()
    const roundedMinutes = Math.ceil(totalMinutes / 15) * 15
    const hour = Math.floor(roundedMinutes / 60).toString().padStart(2, "0")
    const minute = (roundedMinutes % 60).toString().padStart(2, "0")
    const time = `${hour}:${minute}`

    const date = now.toISOString().split("T")[0]

    return {
      scheduleDate: date,
      checkInTime: time,
      checkOutTime: "none",
      breakTime: 1.0,
      workLocation: "office" as const,
      reflection: "",
      userId: undefined,
      plans: [{ projectId: "none", content: "", details: "" }],
      actuals: [{ projectId: "none", content: "", hours: 0, details: "" }],
    }
  }, [schedule])

  const form = useForm<ScheduleFormValues>({
    resolver: zodResolver(scheduleFormSchema),
    defaultValues: defaultFormValues,
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

  // 予定情報を実績情報にコピーする関数
  const copyPlansToActuals = () => {
    const currentPlans = form.watch("plans")

    // 予定情報が存在する場合のみコピー
    if (currentPlans && currentPlans.length > 0) {
      // 各予定を実績形式に変換して追加
      currentPlans.forEach((plan) => {
        // 内容が空の予定はスキップ
        if (!plan.content || plan.content.trim() === "") {
          return
        }

        appendActual({
          projectId: plan.projectId || "none",
          content: plan.content || "",
          hours: 0,
          details: plan.details || "",
        })
      })
    }
  }

  // scheduleプロパティが変更された時にフォームをリセット（編集モード・複製モード用）
  useEffect(() => {

    if (!schedule) {
      // scheduleがnullの場合、初期化フラグもリセット
      hasInitializedData.current = false
      previousScheduleKey.current = null
      return
    }

    // スケジュールの一意なキーを生成（IDがあればID、なければ日付+チェックイン時刻）
    const scheduleKey = schedule.id || `${schedule.scheduleDate}-${schedule.checkInTime || 'none'}`
    const hasScheduleChanged = previousScheduleKey.current !== scheduleKey

    if (hasScheduleChanged) {
      hasInitializedData.current = false
      previousScheduleKey.current = scheduleKey
    }

    // 既にデータを設定済みの場合はスキップ
    if (hasInitializedData.current) {
      return
    }

    hasInitializedData.current = true

    const resetData = {
      scheduleDate: formatDateForInput(schedule.scheduleDate),
      checkInTime: schedule.checkInTime || "none",
      checkOutTime: schedule.checkOutTime || "none",
      breakTime: schedule.breakTime ?? undefined,
      workLocation: schedule.workLocation ?? undefined,
      reflection: schedule.reflection || "",
      userId: schedule.userId || undefined,
      plans: schedule.plans && schedule.plans.length > 0
        ? schedule.plans.map(plan => ({
            projectId: plan.projectId || "none",
            content: plan.content,
            details: plan.details || "",
          }))
        : [{ projectId: "none", content: "", details: "" }],
      actuals: schedule.actuals && schedule.actuals.length > 0
        ? schedule.actuals.map(actual => ({
            projectId: actual.projectId || "none",
            content: actual.content,
            hours: actual.hours,
            details: actual.details || "",
          }))
        : [{ projectId: "none", content: "", hours: 0, details: "" }],
    }

    form.reset(resetData)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schedule])

  const handleSubmit = async (data: ScheduleFormValues) => {
    // 空の項目を除外し、未選択の値はnull/undefinedに整形
    const filteredData = {
      ...data,
      checkInTime: data.checkInTime === "none" ? null : data.checkInTime,
      checkOutTime: data.checkOutTime === "none" ? null : data.checkOutTime,
      workLocation: data.workLocation,
      plans: data.plans
        .filter(plan => (plan.content ?? "").trim() !== "")
        .map(plan => ({
          ...plan,
          content: plan.content?.trim() ?? "",
          projectId: plan.projectId === "none" ? undefined : plan.projectId
        })),
      actuals: data.actuals
        .filter(actual => {
          const hasContent = (actual.content ?? "").trim().length > 0
          const hasProject = actual.projectId && actual.projectId !== "none"
          const hasHours = Number(actual.hours) > 0
          return hasContent || hasProject || hasHours
        })
        .map(actual => ({
          ...actual,
          content: (actual.content ?? "").trim(),
          projectId: actual.projectId === "none" ? undefined : actual.projectId
        })),
    }
    await onSubmit(filteredData)
  }

  return (
    <>
    <Card className="max-w-6xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          {readOnly ? "予定実績詳細（閲覧専用）" : (isEdit ? "予定実績編集" : "新規予定実績登録")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form id={formId} onSubmit={form.handleSubmit(handleSubmit)} className="space-y-8">
            {/* 基本情報 */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">基本情報</h3>

              {/* 1行目: 日付 + 担当者 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              </div>

              {/* 2行目: 出社時刻 + 退社時刻 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="checkInTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>出社時刻</FormLabel>
                      <Select
                        key={`checkInTime-${field.value || 'none'}`}
                        onValueChange={field.onChange}
                        value={field.value || ""}
                        disabled={readOnly}
                      >
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
                      <Select
                        key={`checkOutTime-${field.value || 'none'}`}
                        onValueChange={field.onChange}
                        value={field.value || ""}
                        disabled={readOnly}
                      >
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

                <FormField
                  control={form.control}
                  name="breakTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>休憩時間</FormLabel>
                      <FormControl>
                        <Input
                          type="text"
                          name={field.name}
                          placeholder="0"
                          value={field.value !== undefined && field.value !== null ? field.value : 0}
                          onChange={(e) => {
                            const value = e.target.value
                            // 数値または小数点のみ許可（入力途中の「.」も許可）
                            if (value === "" || /^\d*\.?\d*$/.test(value)) {
                              // 空の場合はundefined、入力途中（例: "1."）の場合はそのまま、完全な数値の場合はparseFloat
                              if (value === "") {
                                field.onChange(0)
                              } else if (value.endsWith(".") || value === ".") {
                                // 小数点で終わる場合は文字列として保持（入力途中）
                                field.onChange(value)
                              } else {
                                const numValue = parseFloat(value)
                                field.onChange(isNaN(numValue) ? undefined : numValue)
                              }
                            }
                          }}
                          onBlur={(e) => {
                            // フォーカスが外れた時に数値に変換
                            const value = e.target.value
                            if (value === "" || value === ".") {
                              field.onChange(undefined)
                            } else {
                              const numValue = parseFloat(value)
                              field.onChange(isNaN(numValue) ? undefined : numValue)
                            }
                          }}
                          disabled={readOnly}
                        />
                      </FormControl>
                      <FormDescription>
                        時間単位で入力してください（0.25時間刻み、例: 1.0）
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="workLocation"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>勤務形態 *</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value ?? undefined}
                        disabled={readOnly}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="勤務形態を選択" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {workLocationOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        出社場所、勤務形態を入力してください。
                      </FormDescription>
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
                            <FormLabel>予定内容</FormLabel>
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

            {/* 予定情報をコピーするボタン */}
            {!readOnly && (
              <div className="flex justify-center">
                <Button
                  type="button"
                  variant="default"
                  size="default"
                  onClick={copyPlansToActuals}
                  className="gap-2"
                >
                  <Copy className="h-4 w-4" />
                  予定を実績にコピー
                </Button>
              </div>
            )}

            <Separator />

            {/* 実績情報 */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <h3 className="text-lg font-medium">実績情報</h3>
                  {readOnly && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      合計時間: {totalHours.toFixed(2)}h
                    </div>
                  )}
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
                            return (
                              <FormItem>
                                <FormLabel>実績時間</FormLabel>
                                <FormControl>
                                  <Input
                                    type="text"
                                    name={field.name}
                                    placeholder="2.5"
                                    className="w-24"
                                    value={field.value === 0 ? "" : field.value}
                                    onChange={(e) => {
                                      const value = e.target.value
                                      // 数値または小数点のみ許可（入力途中の「.」も許可）
                                      if (value === "" || /^\d*\.?\d*$/.test(value)) {
                                        // 空の場合は0、入力途中（例: "0."）の場合はそのまま、完全な数値の場合はparseFloat
                                        if (value === "") {
                                          field.onChange(0)
                                        } else if (value.endsWith(".") || value === ".") {
                                          // 小数点で終わる場合は文字列として保持（入力途中）
                                          field.onChange(value)
                                        } else {
                                          const numValue = parseFloat(value)
                                          field.onChange(isNaN(numValue) ? 0 : numValue)
                                        }
                                      }
                                    }}
                                    onBlur={(e) => {
                                      // フォーカスが外れた時に数値に変換
                                      const value = e.target.value
                                      if (value === "" || value === ".") {
                                        field.onChange(0)
                                      } else {
                                        const numValue = parseFloat(value)
                                        field.onChange(isNaN(numValue) ? 0 : numValue)
                                      }
                                    }}
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
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>実績内容</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="例: 資料作成"
                                className="min-h-[120px]"
                                {...field}
                                value={field.value || ""}
                                disabled={readOnly}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
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
            <div className={`flex justify-end gap-4 ${readOnly ? "" : "hidden"}`}>
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={isLoading}
              >
                {readOnly ? "戻る" : "キャンセル"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
    {!readOnly && (
      <div className="fixed bottom-6 right-6 z-40 max-sm:bottom-4 max-sm:right-4">
        <div className="bg-background border rounded-lg shadow-lg p-4 flex flex-col gap-4 items-end min-w-[220px]">
          <div className="flex items-center gap-2 text-sm text-muted-foreground whitespace-nowrap">
            <Clock className="h-4 w-4" />
            実績合計時間: {totalHours.toFixed(2)}h
          </div>
          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isLoading}
            >
              キャンセル
            </Button>
            <Button type="submit" form={formId} disabled={isLoading}>
              {isLoading 
                ? (isEdit ? "更新中..." : "登録中...")
                : (isEdit ? "更新" : "登録")
              }
            </Button>
          </div>
        </div>
      </div>
    )}
    </>
  )
}
