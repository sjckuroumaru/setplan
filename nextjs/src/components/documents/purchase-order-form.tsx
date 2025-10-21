"use client"

import { useState, useEffect } from "react"
import { useForm, useFieldArray } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { PurchaseOrderFormSchema } from "@/lib/validations/document"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { z } from "zod"
import { usePurchaseOrderCalculations } from "@/hooks/use-purchase-order-calculations"
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Plus, Trash2 } from "lucide-react"

type PurchaseOrderFormData = z.infer<typeof PurchaseOrderFormSchema>

type Customer = {
  id: string
  name: string
}

interface PurchaseOrderFormProps {
  initialData?: any
  isEditMode?: boolean
}

export function PurchaseOrderForm({ initialData, isEditMode = false }: PurchaseOrderFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [customers, setCustomers] = useState<Customer[]>([])

  const form = useForm<PurchaseOrderFormData>({
    resolver: zodResolver(PurchaseOrderFormSchema) as any,
    defaultValues: initialData || {
      supplierId: "",
      honorific: "御中",
      subject: "",
      issueDate: new Date().toISOString().split("T")[0],
      deliveryDate: "",
      completionPeriod: "",
      deliveryLocation: "",
      paymentTerms: "",
      taxType: "exclusive",
      taxRate: 10,
      roundingType: "floor",
      remarks: "",
      items: [
        {
          name: "",
          quantity: 1,
          unit: "",
          unitPrice: 0,
          taxType: "taxable",
          taxRate: 10,
          amount: "0",
          remarks: "",
          displayOrder: 0,
        },
      ],
    },
  })

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  })

  // 金額計算カスタムフックを使用
  const { calculatedAmounts, calculateAmounts } = usePurchaseOrderCalculations(form)

  useEffect(() => {
    fetchCustomers()
  }, [])

  const fetchCustomers = async () => {
    try {
      const response = await fetch("/api/customers")
      if (!response.ok) throw new Error()
      const data = await response.json()
      setCustomers(data.customers || [])
    } catch {
      toast.error("発注先の取得に失敗しました")
    }
  }

  const onSubmit = async (data: PurchaseOrderFormData) => {
    setLoading(true)

    try {
      // 金額計算
      const amounts = calculateAmounts()
      const calculatedData = {
        ...data,
        ...amounts,
        items: data.items.map((item, index) => ({
          ...item,
          amount: Number(item.quantity) * Number(item.unitPrice),
          displayOrder: index,
        })),
      }

      const url = isEditMode && initialData 
        ? `/api/purchase-orders/${initialData.id}` 
        : "/api/purchase-orders"
      
      const method = isEditMode ? "PUT" : "POST"

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(calculatedData),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "発注書の保存に失敗しました")
      }

      const result = await response.json()

      toast.success(isEditMode ? "発注書を更新しました" : "発注書を作成しました")

      router.push(`/purchase-orders/${result.purchaseOrder.id}`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "発注書の保存に失敗しました")
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("ja-JP", {
      style: "currency",
      currency: "JPY",
    }).format(amount)
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* 基本情報 */}
        <Card>
          <CardHeader>
            <CardTitle>基本情報</CardTitle>
            <CardDescription>
              発注書の基本情報を入力してください
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="supplierId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>発注先 *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="発注先を選択" />
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
                    <Input {...field} placeholder="○○システム開発業務委託" />
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
                name="deliveryDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>納期</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="completionPeriod"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>研修完了期間</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="契約締結後3ヶ月" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="deliveryLocation"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>納入場所</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="貴社指定場所" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="paymentTerms"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>お支払い条件</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="月末締め翌月末払い" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* 明細 */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>明細</CardTitle>
                <CardDescription>
                  発注項目を入力してください
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
                  taxRate: 10,
                  amount: "0",
                  remarks: "",
                  displayOrder: fields.length,
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
                  <TableHead className="w-[300px]">品名</TableHead>
                  <TableHead className="w-[100px]">数量</TableHead>
                  <TableHead className="w-[80px]">単位</TableHead>
                  <TableHead className="w-[120px]">単価</TableHead>
                  <TableHead className="w-[100px]">税率</TableHead>
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
                              <Input {...field} placeholder="品名" />
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
                              <Input {...field} type="text" />
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
                              <Input {...field} type="text" />
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
                            <Select 
                              onValueChange={(value) => field.onChange(Number(value))} 
                              value={String(field.value)}
                            >
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
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(
                        Number(form.watch(`items.${index}.quantity`)) * Number(form.watch(`items.${index}.unitPrice`))
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
                    <FormLabel>標準税率 (%)</FormLabel>
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
                {calculatedAmounts.taxAmount8 > 0 && (
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span className="ml-4">（8%対象）</span>
                    <span>{formatCurrency(calculatedAmounts.taxAmount8)}</span>
                  </div>
                )}
                {calculatedAmounts.taxAmount10 > 0 && (
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span className="ml-4">（10%対象）</span>
                    <span>{formatCurrency(calculatedAmounts.taxAmount10)}</span>
                  </div>
                )}
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
            onClick={() => router.push("/purchase-orders")}
          >
            キャンセル
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? (isEditMode ? "更新中..." : "作成中...") : (isEditMode ? "更新" : "作成")}
          </Button>
        </div>
      </form>
    </Form>
  )
}