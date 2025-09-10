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

const invoiceItemSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "項目名は必須です"),
  quantity: z.coerce.number().positive("数量は正の数である必要があります"),
  unit: z.string().optional(),
  unitPrice: z.coerce.number().min(0, "単価は0以上である必要があります"),
  taxType: z.enum(["taxable", "non-taxable", "tax-included"]),
  taxRate: z.coerce.number().default(10),
  remarks: z.string().optional(),
})

const formSchema = z.object({
  customerId: z.string().min(1, "顧客を選択してください"),
  honorific: z.string().default("御中"),
  subject: z.string().min(1, "件名は必須です"),
  issueDate: z.string().optional(),
  dueDate: z.string().optional(),
  taxType: z.enum(["inclusive", "exclusive"]).default("exclusive"),
  taxRate: z.coerce.number().default(10),
  roundingType: z.enum(["floor", "ceil", "round"]).default("floor"),
  remarks: z.string().optional(),
  status: z.enum(["draft", "sent", "paid", "overdue", "cancelled"]).default("draft"),
  items: z.array(invoiceItemSchema).min(1, "明細を1件以上追加してください"),
})

type FormData = z.infer<typeof formSchema>

interface Customer {
  id: string
  name: string
}

export default function EditInvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  const { data: session } = useSession()
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [customers, setCustomers] = useState<Customer[]>([])
  const [calculatedAmounts, setCalculatedAmounts] = useState({
    subtotal: 0,
    taxAmount: 0,
    taxAmount8: 0,
    taxAmount10: 0,
    totalAmount: 0,
  })

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      customerId: "",
      honorific: "御中",
      subject: "",
      issueDate: new Date().toISOString().split("T")[0],
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
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

  // 顧客一覧を取得
  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        const response = await fetch("/api/customers")
        if (!response.ok) throw new Error("顧客の取得に失敗しました")
        const data = await response.json()
        setCustomers(data.customers || [])
      } catch (error) {
        toast.error("顧客の取得に失敗しました")
      }
    }
    fetchCustomers()
  }, [])

  // 請求書データを取得
  useEffect(() => {
    const fetchInvoice = async () => {
      try {
        const response = await fetch(`/api/invoices/${resolvedParams.id}`)
        if (!response.ok) throw new Error("請求書の取得に失敗しました")
        const result = await response.json()
        const data = result.invoice
        
        // フォームに値をセット
        form.reset({
          customerId: data.customerId,
          honorific: data.honorific,
          subject: data.subject,
          issueDate: data.issueDate ? new Date(data.issueDate).toISOString().split("T")[0] : "",
          dueDate: data.dueDate ? new Date(data.dueDate).toISOString().split("T")[0] : "",
          taxType: data.taxType,
          taxRate: data.taxRate,
          roundingType: data.roundingType,
          remarks: data.remarks || "",
          status: data.status,
          items: data.items.map((item: any) => ({
            id: item.id,
            name: item.name,
            quantity: parseFloat(item.quantity),
            unit: item.unit || "",
            unitPrice: parseFloat(item.unitPrice),
            taxType: item.taxType,
            taxRate: item.taxRate || 10,
            remarks: item.remarks || "",
          })),
        })
        setIsLoading(false)
      } catch (error) {
        toast.error("請求書の取得に失敗しました")
        router.push("/invoices")
      }
    }
    fetchInvoice()
  }, [resolvedParams.id, form, router])

  // 金額計算
  const calculateAmounts = () => {
    const items = form.getValues("items")
    const taxType = form.getValues("taxType")
    const taxRate = form.getValues("taxRate")
    const roundingType = form.getValues("roundingType")

    let subtotal = 0
    let taxAmount8Total = 0
    let taxAmount10Total = 0

    items.forEach(item => {
      const amount = item.quantity * item.unitPrice
      
      if (taxType === "exclusive") {
        subtotal += amount
        if (item.taxType === "taxable") {
          const itemTaxRate = item.taxRate || taxRate
          const tax = amount * (itemTaxRate / 100)
          if (itemTaxRate === 8) {
            taxAmount8Total += tax
          } else if (itemTaxRate === 10) {
            taxAmount10Total += tax
          }
        }
      } else {
        // 税込の場合
        if (item.taxType === "taxable") {
          const itemTaxRate = item.taxRate || taxRate
          const baseAmount = amount / (1 + itemTaxRate / 100)
          subtotal += baseAmount
          const tax = amount - baseAmount
          if (itemTaxRate === 8) {
            taxAmount8Total += tax
          } else if (itemTaxRate === 10) {
            taxAmount10Total += tax
          }
        } else {
          subtotal += amount
        }
      }
    })

    // 端数処理
    const round = (value: number) => {
      switch (roundingType) {
        case "floor":
          return Math.floor(value)
        case "ceil":
          return Math.ceil(value)
        case "round":
          return Math.round(value)
        default:
          return Math.floor(value)
      }
    }

    taxAmount8Total = round(taxAmount8Total)
    taxAmount10Total = round(taxAmount10Total)
    const taxAmount = taxAmount8Total + taxAmount10Total
    const totalAmount = round(subtotal + taxAmount)

    setCalculatedAmounts({
      subtotal: round(subtotal),
      taxAmount,
      taxAmount8: taxAmount8Total,
      taxAmount10: taxAmount10Total,
      totalAmount,
    })
  }

  // フォーム値変更時に金額を再計算
  useEffect(() => {
    const subscription = form.watch(() => {
      calculateAmounts()
    })
    return () => subscription.unsubscribe()
  }, [form])

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true)
    try {
      // itemsのデータを整形（数値を文字列に変換し、必要なフィールドを追加）
      const formattedItems = data.items.map((item, index) => ({
        ...item,
        quantity: item.quantity.toString(),
        unitPrice: item.unitPrice.toString(),
        amount: (item.quantity * item.unitPrice).toString(),
        displayOrder: index,
      }))

      const response = await fetch(`/api/invoices/${resolvedParams.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...data,
          items: formattedItems,
          ...calculatedAmounts,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "請求書の更新に失敗しました")
      }

      toast.success("請求書を更新しました")
      router.push(`/invoices/${resolvedParams.id}`)
    } catch (error) {
      toast.error("請求書の更新に失敗しました")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-1/4" />
            <Skeleton className="h-4 w-1/3" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8">
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => router.push(`/invoices/${resolvedParams.id}`)}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          戻る
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>請求書編集</CardTitle>
          <CardDescription>
            請求書の内容を編集します
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="customerId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>顧客</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
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
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="御中">御中</SelectItem>
                          <SelectItem value="様">様</SelectItem>
                        </SelectContent>
                      </Select>
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
                    <FormLabel>件名</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="issueDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>請求日</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="dueDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>支払期限</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="taxType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>税計算</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
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
                      <FormLabel>税率（％）</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
                      </FormControl>
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
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
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

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ステータス</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="draft">下書き</SelectItem>
                        <SelectItem value="sent">送付済み</SelectItem>
                        <SelectItem value="paid">入金済み</SelectItem>
                        <SelectItem value="overdue">期限超過</SelectItem>
                        <SelectItem value="cancelled">キャンセル</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold">明細</h3>
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
                      taxRate: 10,
                      remarks: "",
                    })}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    明細追加
                  </Button>
                </div>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>項目名</TableHead>
                      <TableHead>数量</TableHead>
                      <TableHead>単位</TableHead>
                      <TableHead>単価</TableHead>
                      <TableHead>税区分</TableHead>
                      <TableHead>税率</TableHead>
                      <TableHead>金額</TableHead>
                      <TableHead></TableHead>
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
                                  <Input {...field} />
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
                                  <Input type="number" {...field} />
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
                                  <Input {...field} />
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
                                  <Input type="number" {...field} />
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
                                <FormControl>
                                  <Select
                                    onValueChange={field.onChange}
                                    defaultValue={field.value}
                                  >
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="taxable">課税</SelectItem>
                                      <SelectItem value="non-taxable">非課税</SelectItem>
                                      <SelectItem value="tax-included">内税</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </TableCell>
                        <TableCell>
                          <FormField
                            control={form.control}
                            name={`items.${index}.taxRate`}
                            render={({ field }) => (
                              <FormItem>
                                <FormControl>
                                  <Select
                                    onValueChange={(value) => field.onChange(parseInt(value))}
                                    defaultValue={field.value?.toString()}
                                  >
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="10">10%</SelectItem>
                                      <SelectItem value="8">8%</SelectItem>
                                      <SelectItem value="0">0%</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </TableCell>
                        <TableCell>
                          ¥{((form.watch(`items.${index}.quantity`) || 0) * (form.watch(`items.${index}.unitPrice`) || 0)).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => remove(index)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="border-t pt-4">
                <div className="space-y-2 text-right">
                  <div>小計: ¥{calculatedAmounts.subtotal.toLocaleString()}</div>
                  <div>消費税: ¥{calculatedAmounts.taxAmount.toLocaleString()}</div>
                  {calculatedAmounts.taxAmount8 > 0 && (
                    <div className="text-sm text-muted-foreground">
                      （8%対象: ¥{calculatedAmounts.taxAmount8.toLocaleString()}）
                    </div>
                  )}
                  {calculatedAmounts.taxAmount10 > 0 && (
                    <div className="text-sm text-muted-foreground">
                      （10%対象: ¥{calculatedAmounts.taxAmount10.toLocaleString()}）
                    </div>
                  )}
                  <div className="text-lg font-semibold">
                    合計: ¥{calculatedAmounts.totalAmount.toLocaleString()}
                  </div>
                </div>
              </div>

              <FormField
                control={form.control}
                name="remarks"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>備考</FormLabel>
                    <FormControl>
                      <Textarea {...field} rows={4} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end space-x-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push(`/invoices/${resolvedParams.id}`)}
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
        </CardContent>
      </Card>
    </div>
  )
}