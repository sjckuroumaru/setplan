"use client"

import { useState, useEffect, use } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm, useFieldArray } from "react-hook-form"
import * as z from "zod"
import { toast } from "sonner"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  ArrowLeft,
  Plus,
  Trash2,
  Save,
} from "lucide-react"

const estimateItemSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "項目名は必須です"),
  quantity: z.coerce.number().positive("数量は正の数である必要があります"),
  unit: z.string().optional(),
  unitPrice: z.coerce.number().min(0, "単価は0以上である必要があります"),
  taxType: z.enum(["taxable", "non-taxable", "tax-included"]),
  remarks: z.string().optional(),
})

const formSchema = z.object({
  customerId: z.string().min(1, "顧客を選択してください"),
  honorific: z.string().default("御中"),
  subject: z.string().min(1, "件名は必須です"),
  issueDate: z.string().optional(),
  validUntil: z.string().optional(),
  taxType: z.enum(["inclusive", "exclusive"]).default("exclusive"),
  taxRate: z.coerce.number().default(10),
  roundingType: z.enum(["floor", "ceil", "round"]).default("floor"),
  remarks: z.string().optional(),
  status: z.enum(["draft", "sent", "accepted", "rejected", "expired"]).default("draft"),
  items: z.array(estimateItemSchema).min(1, "明細を1件以上追加してください"),
})

type FormData = z.infer<typeof formSchema>

interface Customer {
  id: string
  name: string
}

export default function EditEstimatePage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  const { data: session } = useSession()
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [customers, setCustomers] = useState<Customer[]>([])
  const [calculatedAmounts, setCalculatedAmounts] = useState({
    subtotal: 0,
    taxAmount: 0,
    totalAmount: 0,
  })

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      customerId: "",
      honorific: "御中",
      subject: "",
      issueDate: new Date().toISOString().split("T")[0],
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      taxType: "exclusive",
      taxRate: 10,
      roundingType: "floor",
      remarks: "",
      status: "draft",
      items: [],
    },
  })

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  })

  // 見積データと顧客一覧を取得
  useEffect(() => {
    const fetchData = async () => {
      try {
        // 見積データ取得
        const estimateResponse = await fetch(`/api/estimates/${resolvedParams.id}`)
        if (!estimateResponse.ok) {
          if (estimateResponse.status === 404) {
            toast.error("見積が見つかりません")
            router.push("/estimates")
            return
          }
          throw new Error()
        }
        
        const estimateData = await estimateResponse.json()
        const estimate = estimateData.estimate

        // 顧客一覧取得
        const customersResponse = await fetch("/api/customers?status=active&limit=100")
        if (customersResponse.ok) {
          const customersData = await customersResponse.json()
          setCustomers(customersData.customers)
        }

        // フォームにデータを設定
        form.reset({
          customerId: estimate.customerId,
          honorific: estimate.honorific,
          subject: estimate.subject,
          issueDate: new Date(estimate.issueDate).toISOString().split("T")[0],
          validUntil: new Date(estimate.validUntil).toISOString().split("T")[0],
          taxType: estimate.taxType,
          taxRate: estimate.taxRate,
          roundingType: estimate.roundingType,
          remarks: estimate.remarks || "",
          status: estimate.status,
          items: estimate.items.map((item: any) => ({
            id: item.id,
            name: item.name,
            quantity: parseFloat(item.quantity),
            unit: item.unit || "",
            unitPrice: parseFloat(item.unitPrice),
            taxType: item.taxType,
            remarks: item.remarks || "",
          })),
        })
      } catch (error) {
        toast.error("データの取得に失敗しました")
        router.push("/estimates")
      } finally {
        setIsLoading(false)
      }
    }

    if (session) {
      fetchData()
    }
  }, [session, resolvedParams.id, router, form])

  // 金額計算
  const calculateAmounts = () => {
    const items = form.getValues("items")
    const taxType = form.getValues("taxType")
    const taxRate = form.getValues("taxRate")
    const roundingType = form.getValues("roundingType")

    let subtotal = 0
    let taxableAmount = 0

    items.forEach((item) => {
      const amount = item.quantity * item.unitPrice
      subtotal += amount

      if (item.taxType === "taxable") {
        if (taxType === "inclusive") {
          // 税込の場合
          taxableAmount += amount / (1 + taxRate / 100)
        } else {
          // 税別の場合
          taxableAmount += amount
        }
      }
    })

    let taxAmount = 0
    if (taxType === "inclusive") {
      // 税込の場合、小計から税額を逆算
      taxAmount = subtotal - subtotal / (1 + taxRate / 100)
    } else {
      // 税別の場合
      taxAmount = taxableAmount * (taxRate / 100)
    }

    // 端数処理
    switch (roundingType) {
      case "floor":
        taxAmount = Math.floor(taxAmount)
        break
      case "ceil":
        taxAmount = Math.ceil(taxAmount)
        break
      case "round":
        taxAmount = Math.round(taxAmount)
        break
    }

    const totalAmount = taxType === "inclusive" ? subtotal : subtotal + taxAmount

    setCalculatedAmounts({
      subtotal,
      taxAmount,
      totalAmount,
    })
  }

  // 明細変更時に金額を再計算
  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name?.startsWith("items") || name === "taxType" || name === "taxRate" || name === "roundingType") {
        calculateAmounts()
      }
    })
    return () => subscription.unsubscribe()
  }, [form.watch])

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true)
    try {
      const response = await fetch(`/api/estimates/${resolvedParams.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })

      if (!response.ok) throw new Error()
      
      toast.success("見積を更新しました")
      router.push(`/estimates/${resolvedParams.id}`)
    } catch (error) {
      toast.error("更新に失敗しました")
    } finally {
      setIsSubmitting(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("ja-JP", {
      style: "currency",
      currency: "JPY",
    }).format(amount)
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
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push(`/estimates/${resolvedParams.id}`)}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h2 className="text-3xl font-bold tracking-tight">見積編集</h2>
          <p className="text-muted-foreground">
            見積情報を編集します
          </p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* 基本情報 */}
          <Card>
            <CardHeader>
              <CardTitle>基本情報</CardTitle>
              <CardDescription>
                見積の基本情報を編集してください
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="customerId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>顧客 *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="顧客を選択" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {customers.map((customer) => (
                            <SelectItem key={customer.id} value={customer.id}>
                              {customer.name}
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
                  name="honorific"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>敬称</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="御中" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="subject"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>件名 *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="○○システム開発費用" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="issueDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>発行日</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="validUntil"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>有効期限</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
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
                      <FormLabel>ステータス</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="draft">下書き</SelectItem>
                          <SelectItem value="sent">送付済</SelectItem>
                          <SelectItem value="accepted">承認済</SelectItem>
                          <SelectItem value="rejected">却下</SelectItem>
                          <SelectItem value="expired">期限切れ</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* 明細 */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>明細</CardTitle>
                  <CardDescription>
                    見積項目を編集してください
                  </CardDescription>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => append({
                    name: "",
                    quantity: 1,
                    unit: "",
                    unitPrice: 0,
                    taxType: "taxable",
                    remarks: "",
                  })}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  明細追加
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[300px]">項目名</TableHead>
                    <TableHead className="w-[100px]">数量</TableHead>
                    <TableHead className="w-[80px]">単位</TableHead>
                    <TableHead className="w-[120px]">単価</TableHead>
                    <TableHead className="w-[120px]">税区分</TableHead>
                    <TableHead className="text-right">金額</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fields.map((field, index) => (
                    <TableRow key={field.id}>
                      <TableCell>
                        <FormField
                          control={form.control}
                          name={`items.${index}.name`}
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <Input {...field} placeholder="項目名" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </TableCell>
                      <TableCell>
                        <FormField
                          control={form.control}
                          name={`items.${index}.quantity`}
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <Input {...field} type="number" min="0" step="0.01" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </TableCell>
                      <TableCell>
                        <FormField
                          control={form.control}
                          name={`items.${index}.unit`}
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <Input {...field} placeholder="個" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </TableCell>
                      <TableCell>
                        <FormField
                          control={form.control}
                          name={`items.${index}.unitPrice`}
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <Input {...field} type="number" min="0" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </TableCell>
                      <TableCell>
                        <FormField
                          control={form.control}
                          name={`items.${index}.taxType`}
                          render={({ field }) => (
                            <FormItem>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="taxable">課税</SelectItem>
                                  <SelectItem value="non-taxable">非課税</SelectItem>
                                  <SelectItem value="tax-included">税込</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(
                          form.watch(`items.${index}.quantity`) * form.watch(`items.${index}.unitPrice`)
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => remove(index)}
                          disabled={fields.length === 1}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* 計算設定 */}
          <Card>
            <CardHeader>
              <CardTitle>計算設定</CardTitle>
              <CardDescription>
                税計算の設定を行います
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="taxType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>税計算方法</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="exclusive">税別</SelectItem>
                          <SelectItem value="inclusive">税込</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="taxRate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>消費税率 (%)</FormLabel>
                      <Select onValueChange={(value) => field.onChange(Number(value))} value={String(field.value)}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="10">10%</SelectItem>
                          <SelectItem value="8">8%</SelectItem>
                          <SelectItem value="0">0%</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="roundingType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>端数処理</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="floor">切り捨て</SelectItem>
                          <SelectItem value="ceil">切り上げ</SelectItem>
                          <SelectItem value="round">四捨五入</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="border rounded-lg p-4 bg-muted/50">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>小計</span>
                    <span className="font-medium">{formatCurrency(calculatedAmounts.subtotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>消費税</span>
                    <span className="font-medium">{formatCurrency(calculatedAmounts.taxAmount)}</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold border-t pt-2">
                    <span>合計</span>
                    <span>{formatCurrency(calculatedAmounts.totalAmount)}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 備考 */}
          <Card>
            <CardHeader>
              <CardTitle>備考</CardTitle>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="remarks"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Textarea 
                        {...field} 
                        className="min-h-[100px]"
                        placeholder="備考を入力してください"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push(`/estimates/${resolvedParams.id}`)}
            >
              キャンセル
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              <Save className="mr-2 h-4 w-4" />
              {isSubmitting ? "更新中..." : "更新"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  )
}