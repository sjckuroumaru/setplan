"use client"

import { useState, useEffect, useRef, use } from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm, useFieldArray } from "react-hook-form"
import * as z from "zod"
import { toast } from "sonner"
import { useInvoiceCalculations } from "@/hooks/use-invoice-calculations"
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

const deliveryNoteItemSchema = z.object({
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
  deliveryDate: z.string(),
  taxType: z.enum(["inclusive", "exclusive"]).default("exclusive"),
  taxRate: z.coerce.number().default(10),
  roundingType: z.enum(["floor", "ceil", "round"]).default("floor"),
  remarks: z.string().optional(),
  status: z.enum(["draft", "sent"]).default("draft"),
  items: z.array(deliveryNoteItemSchema).min(1, "明細を1件以上追加してください"),
})

type FormData = z.infer<typeof formSchema>

interface Customer {
  id: string
  name: string
}

export default function EditDeliveryNotePage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [customers, setCustomers] = useState<Customer[]>([])

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      customerId: "",
      honorific: "御中",
      subject: "",
      deliveryDate: new Date().toISOString().split("T")[0],
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

  // 金額計算カスタムフックを使用
  const { calculatedAmounts, calculateAmounts } = useInvoiceCalculations(form)

  // データ取得済みフラグと前回のページID
  const hasFetchedData = useRef(false)
  const previousPageId = useRef<string | null>(null)

  // 納品書データと顧客一覧を取得
  useEffect(() => {
    // ページIDが変わった場合は、フラグをリセット
    if (previousPageId.current !== resolvedParams.id) {
      hasFetchedData.current = false
      previousPageId.current = resolvedParams.id
    }

    // 既にデータを取得済みの場合はスキップ
    if (hasFetchedData.current) {
      return
    }

    hasFetchedData.current = true

    const fetchData = async () => {
      try {
        // 納品書データ取得
        const deliveryNoteResponse = await fetch(`/api/delivery-notes/${resolvedParams.id}`)
        if (!deliveryNoteResponse.ok) {
          if (deliveryNoteResponse.status === 404) {
            toast.error("納品書が見つかりません")
            router.push("/delivery-notes")
            return
          }
          throw new Error()
        }

        const deliveryNoteResult = await deliveryNoteResponse.json()
        const data = deliveryNoteResult.deliveryNote

        // 顧客一覧取得
        const customersResponse = await fetch("/api/customers")
        if (customersResponse.ok) {
          const customersData = await customersResponse.json()
          setCustomers(customersData.customers || [])
        }

        // フォームにデータを設定
        form.reset({
          customerId: data.customerId,
          honorific: data.honorific,
          subject: data.subject,
          deliveryDate: data.deliveryDate ? new Date(data.deliveryDate).toISOString().split("T")[0] : "",
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

        // データ取得後に金額を計算
        calculateAmounts()
      } catch {
        toast.error("データの取得に失敗しました")
        router.push("/delivery-notes")
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [resolvedParams.id])

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

      const response = await fetch(`/api/delivery-notes/${resolvedParams.id}`, {
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
        throw new Error(error.error || "納品書の更新に失敗しました")
      }

      toast.success("納品書を更新しました")
      router.push(`/delivery-notes/${resolvedParams.id}`)
    } catch {
      toast.error("納品書の更新に失敗しました")
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
          onClick={() => router.push(`/delivery-notes/${resolvedParams.id}`)}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          戻る
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>納品書編集</CardTitle>
          <CardDescription>
            納品書の内容を編集します
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

              <FormField
                control={form.control}
                name="deliveryDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>納品日</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

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
                                  <Input type="text" {...field} />
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
                                  <Input type="text" {...field} />
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
                  onClick={() => router.push(`/delivery-notes/${resolvedParams.id}`)}
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
