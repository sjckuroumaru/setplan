"use client"

import { useEffect, useState, useRef } from "react"
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

const projectTypeValues = ["development", "ses", "maintenance", "other", "internal", "product"] as const
type ProjectType = typeof projectTypeValues[number]

// フォーム内部で使用する型（すべてstring）
const formSchema = z.object({
  projectNumber: z.string().min(1, "案件番号は必須です"),
  projectName: z.string().min(1, "案件名は必須です"),
  description: z.string().optional(),
  status: z.enum(["planning", "developing", "active", "suspended", "completed"]),
  departmentId: z.string().nullable().optional(),
  purchaseOrderId: z.string().nullable().optional(),
  plannedStartDate: z.string().optional(),
  plannedEndDate: z.string().optional(),
  actualStartDate: z.string().optional(),
  actualEndDate: z.string().optional(),
  budget: z.string().optional(),
  hourlyRate: z.string().optional(),
  // 実績台帳用の新規フィールド
  projectType: z.enum(projectTypeValues),
  deliveryDate: z.string().optional(),
  invoiceableDate: z.string().optional(),
  memo: z.string().optional(),
  outsourcingCost: z.string().optional(),
  serverDomainCost: z.string().optional(),
})

// フォーム内部の型定義
type FormData = z.infer<typeof formSchema>

// 外部APIに送信する型（budgetとhourlyRateは数値）
type ProjectFormValues = {
  projectNumber: string
  projectName: string
  description?: string
  status: "planning" | "developing" | "active" | "suspended" | "completed"
  departmentId?: string | null
  purchaseOrderId?: string | null
  plannedStartDate?: string
  plannedEndDate?: string
  actualStartDate?: string
  actualEndDate?: string
  budget?: number
  hourlyRate?: number
  // 実績台帳用の新規フィールド
  projectType: ProjectType
  deliveryDate?: string
  invoiceableDate?: string
  memo?: string
  outsourcingCost?: number
  serverDomainCost?: number
}

interface Project {
  id: string
  projectNumber: string
  projectName: string
  description: string | null
  status: string
  departmentId: string | null
  departmentRef?: {
    id: string
    name: string
  } | null
  purchaseOrderId: string | null
  purchaseOrderRef?: {
    id: string
    orderNumber: string
    subject: string
  } | null
  plannedStartDate: string | null
  plannedEndDate: string | null
  actualStartDate: string | null
  actualEndDate: string | null
  budget: string | null
  hourlyRate: string | null
  // 実績台帳用の新規フィールド
  projectType: string | null
  deliveryDate: string | null
  invoiceableDate: string | null
  memo: string | null
  outsourcingCost: string | null
  serverDomainCost: string | null
  createdAt: string
  updatedAt: string
}

interface Department {
  id: string
  name: string
}

interface PurchaseOrder {
  id: string
  orderNumber: string
  subject: string
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

const projectTypeOptions = [
  { value: "development", label: "開発" },
  { value: "ses", label: "SES" },
  { value: "maintenance", label: "保守" },
  { value: "internal", label: "社内業務" },
  { value: "product", label: "自社サービス" },
  { value: "other", label: "その他" },
]

// 日付をYYYY-MM-DD形式に変換
const formatDateForInput = (dateString: string | null) => {
  if (!dateString) return ""
  const date = new Date(dateString)
  return date.toISOString().split("T")[0]
}

export function ProjectForm({ project, onSubmit, onCancel, isLoading, isEdit = false }: ProjectFormProps) {
  const [departments, setDepartments] = useState<Department[]>([])
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([])
  const [loadingDepartments, setLoadingDepartments] = useState(false)
  const [loadingPurchaseOrders, setLoadingPurchaseOrders] = useState(false)

  // データ設定済みフラグと前回のプロジェクトID
  const hasInitializedData = useRef(false)
  const previousProjectId = useRef<string | null>(null)

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      projectNumber: project?.projectNumber || "",
      projectName: project?.projectName || "",
      description: project?.description || "",
      status: (project?.status as "planning" | "developing" | "active" | "suspended" | "completed") || "planning",
      departmentId: project?.departmentId || null,
      purchaseOrderId: project?.purchaseOrderId || null,
      plannedStartDate: formatDateForInput(project?.plannedStartDate || null),
      plannedEndDate: formatDateForInput(project?.plannedEndDate || null),
      actualStartDate: formatDateForInput(project?.actualStartDate || null),
      actualEndDate: formatDateForInput(project?.actualEndDate || null),
      budget: project?.budget || "",
      hourlyRate: project?.hourlyRate || "",
      // 実績台帳用の新規フィールド
      projectType: (project?.projectType as ProjectType | undefined) || "development",
      deliveryDate: formatDateForInput(project?.deliveryDate || null),
      invoiceableDate: formatDateForInput(project?.invoiceableDate || null),
      memo: project?.memo || "",
      outsourcingCost: project?.outsourcingCost || "",
      serverDomainCost: project?.serverDomainCost || "",
    },
  })

  // 部署一覧取得
  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        setLoadingDepartments(true)
        const response = await fetch("/api/departments?basic=true&limit=1000")
        const data = await response.json()
        if (response.ok) {
          setDepartments(data.departments)
        }
      } catch (error) {
        console.warn("Failed to fetch departments:", error)
      } finally {
        setLoadingDepartments(false)
      }
    }
    fetchDepartments()
  }, [])

  // 発注書一覧取得
  useEffect(() => {
    const fetchPurchaseOrders = async () => {
      try {
        setLoadingPurchaseOrders(true)
        const response = await fetch("/api/purchase-orders?limit=1000")
        const data = await response.json()
        if (response.ok) {
          setPurchaseOrders(data.purchaseOrders || [])
        }
      } catch (error) {
        console.warn("Failed to fetch purchase orders:", error)
      } finally {
        setLoadingPurchaseOrders(false)
      }
    }
    fetchPurchaseOrders()
  }, [])

  useEffect(() => {
    // プロジェクトIDが変わった場合は、フラグをリセット
    if (previousProjectId.current !== project?.id) {
      hasInitializedData.current = false
      previousProjectId.current = project?.id || null
    }

    // 既にデータを設定済み、またはprojectがない場合はスキップ
    if (hasInitializedData.current || !project) {
      return
    }

    hasInitializedData.current = true

    form.reset({
      projectNumber: project.projectNumber,
      projectName: project.projectName,
      description: project.description || "",
      status: project.status as "planning" | "developing" | "active" | "suspended" | "completed",
      departmentId: project.departmentId || null,
      purchaseOrderId: project.purchaseOrderId || null,
      plannedStartDate: formatDateForInput(project.plannedStartDate),
      plannedEndDate: formatDateForInput(project.plannedEndDate),
      actualStartDate: formatDateForInput(project.actualStartDate),
      actualEndDate: formatDateForInput(project.actualEndDate),
      budget: project.budget || "",
      hourlyRate: project.hourlyRate || "",
      // 実績台帳用の新規フィールド
      projectType: (project.projectType as ProjectType | undefined) || "development",
      deliveryDate: formatDateForInput(project.deliveryDate),
      invoiceableDate: formatDateForInput(project.invoiceableDate),
      memo: project.memo || "",
      outsourcingCost: project.outsourcingCost || "",
      serverDomainCost: project.serverDomainCost || "",
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project?.id])

  const handleSubmit = async (data: FormData) => {
    // フォームデータをAPIの型に変換
    const submitData: ProjectFormValues = {
      projectNumber: data.projectNumber,
      projectName: data.projectName,
      description: data.description,
      status: data.status,
      departmentId: data.departmentId === null ? null : data.departmentId,
      purchaseOrderId: data.purchaseOrderId === null ? null : data.purchaseOrderId,
      plannedStartDate: data.plannedStartDate,
      plannedEndDate: data.plannedEndDate,
      actualStartDate: data.actualStartDate,
      actualEndDate: data.actualEndDate,
      budget: data.budget ? parseFloat(data.budget) : undefined,
      hourlyRate: data.hourlyRate ? parseFloat(data.hourlyRate) : undefined,
      // 実績台帳用の新規フィールド
      projectType: data.projectType,
      deliveryDate: data.deliveryDate,
      invoiceableDate: data.invoiceableDate,
      memo: data.memo,
      outsourcingCost: data.outsourcingCost ? parseFloat(data.outsourcingCost) : undefined,
      serverDomainCost: data.serverDomainCost ? parseFloat(data.serverDomainCost) : undefined,
    }
    await onSubmit(submitData)
  }

  return (
    <Card className="max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>
          {isEdit ? "案件編集" : "新規案件作成"}
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
                          placeholder="案件の詳細説明..."
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

                <FormField
                  control={form.control}
                  name="departmentId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>担当部署・チーム</FormLabel>
                      <Select
                        onValueChange={(value) => field.onChange(value === "none" ? null : value)}
                        value={field.value || "none"}
                        disabled={loadingDepartments}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="部署・チームを選択" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">なし</SelectItem>
                          {departments.map((dept) => (
                            <SelectItem key={dept.id} value={dept.id}>
                              {dept.name}
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
                  name="purchaseOrderId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>関連発注書</FormLabel>
                      <Select
                        onValueChange={(value) => field.onChange(value === "none" ? null : value)}
                        value={field.value || "none"}
                        disabled={loadingPurchaseOrders}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="発注書を選択" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">なし</SelectItem>
                          {purchaseOrders.map((po) => (
                            <SelectItem key={po.id} value={po.id}>
                              {po.orderNumber} - {po.subject}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        この案件に関連する発注書
                      </FormDescription>
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
                        案件が実際に開始された日付
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
                        案件が実際に終了した日付
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* 予算情報 */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">予算情報</h3>

                <FormField
                  control={form.control}
                  name="budget"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>予算（円）</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="1000000"
                          {...field}
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormDescription>
                        プロジェクトの総予算
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="hourlyRate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>時間単価（円/時間）</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="5000"
                          {...field}
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormDescription>
                        1時間あたりの単価（EVM分析で使用）
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* 実績台帳情報 */}
            <div className="space-y-6 pt-6 border-t">
              <h3 className="text-lg font-medium">実績台帳情報</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="projectType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>案件種別 *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="案件種別を選択" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {projectTypeOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        実績台帳での案件分類
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="deliveryDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>納品日</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} value={field.value || ""} />
                      </FormControl>
                      <FormDescription>
                        成果物を納品した日付
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="invoiceableDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>請求可能日</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} value={field.value || ""} />
                      </FormControl>
                      <FormDescription>
                        請求書を発行可能な日付
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="outsourcingCost"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>外注費（円）</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="0"
                          {...field}
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormDescription>
                        外部委託にかかった費用
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="serverDomainCost"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>サーバー・ドメイン代（円）</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="0"
                          {...field}
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormDescription>
                        サーバーやドメインの費用
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="memo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>メモ</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="案件に関するメモや特記事項..."
                        className="min-h-[100px]"
                        {...field}
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormDescription>
                      実績台帳用のメモ・特記事項
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
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
