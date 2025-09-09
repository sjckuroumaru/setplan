"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Building2, Upload, X, AlertCircle } from "lucide-react"

const formSchema = z.object({
  name: z.string().min(1, "会社名は必須です"),
  postalCode: z.string().optional(),
  address: z.string().optional(),
  building: z.string().optional(),
  representative: z.string().optional(),
  phone: z.string().optional(),
  fax: z.string().optional(),
  remarks: z.string().optional(),
  // 請求書用追加フィールド
  qualifiedInvoiceNumber: z.string().optional(),
  bankName: z.string().optional(),
  branchName: z.string().optional(),
  accountType: z.string().optional(),
  accountNumber: z.string().optional(),
  accountHolder: z.string().optional(),
})

type FormData = z.infer<typeof formSchema>

export default function CompanySettingsPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [sealImageUrl, setSealImageUrl] = useState<string | null>(null)

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      postalCode: "",
      address: "",
      building: "",
      representative: "",
      phone: "",
      fax: "",
      remarks: "",
      qualifiedInvoiceNumber: "",
      bankName: "",
      branchName: "",
      accountType: "",
      accountNumber: "",
      accountHolder: "",
    },
  })

  // 管理者権限チェック
  useEffect(() => {
    if (session && !session.user.isAdmin) {
      toast.error("管理者権限が必要です")
      router.push("/dashboard")
    }
  }, [session, router])

  // 自社情報取得
  useEffect(() => {
    const fetchCompany = async () => {
      try {
        const response = await fetch("/api/company")
        
        if (response.ok) {
          const data = await response.json()
          if (data.company) {
            form.reset({
              name: data.company.name || "",
              postalCode: data.company.postalCode || "",
              address: data.company.address || "",
              building: data.company.building || "",
              representative: data.company.representative || "",
              phone: data.company.phone || "",
              fax: data.company.fax || "",
              remarks: data.company.remarks || "",
              qualifiedInvoiceNumber: data.company.qualifiedInvoiceNumber || "",
              bankName: data.company.bankName || "",
              branchName: data.company.branchName || "",
              accountType: data.company.accountType || "",
              accountNumber: data.company.accountNumber || "",
              accountHolder: data.company.accountHolder || "",
            })
            setSealImageUrl(data.company.sealImagePath)
          }
        } else if (response.status !== 401) {
          // 401以外のエラーの場合のみエラーメッセージを表示
          console.error("Failed to fetch company info")
        }
      } catch (error) {
        console.error("Failed to fetch company info:", error)
      } finally {
        setIsLoading(false)
      }
    }

    if (session?.user.isAdmin) {
      fetchCompany()
    }
  }, [session, form])

  // フォーム送信
  const onSubmit = async (data: FormData) => {
    setIsSaving(true)
    try {
      const response = await fetch("/api/company", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })

      if (!response.ok) throw new Error()
      
      toast.success("自社情報を保存しました")
    } catch (error) {
      toast.error("保存に失敗しました")
    } finally {
      setIsSaving(false)
    }
  }

  // 会社印アップロード
  const handleSealUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // ファイルサイズチェック
    if (file.size > 5 * 1024 * 1024) {
      toast.error("ファイルサイズは5MB以下にしてください")
      return
    }

    // ファイル形式チェック
    const allowedTypes = ["image/png", "image/jpeg", "image/jpg"]
    if (!allowedTypes.includes(file.type)) {
      toast.error("PNG、JPG、JPEG形式のみアップロード可能です")
      return
    }

    setIsUploading(true)
    const formData = new FormData()
    formData.append("file", file)

    try {
      const response = await fetch("/api/company/seal", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) throw new Error()
      
      const data = await response.json()
      setSealImageUrl(data.company.sealImagePath)
      toast.success("会社印をアップロードしました")
    } catch (error) {
      toast.error("アップロードに失敗しました")
    } finally {
      setIsUploading(false)
    }
  }

  // 会社印削除
  const handleSealDelete = async () => {
    try {
      const response = await fetch("/api/company/seal", {
        method: "DELETE",
      })

      if (!response.ok) throw new Error()
      
      setSealImageUrl(null)
      toast.success("会社印を削除しました")
    } catch (error) {
      toast.error("削除に失敗しました")
    }
  }

  if (!session?.user.isAdmin) {
    return null
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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">自社情報設定</h2>
          <p className="text-muted-foreground">
            見積書などに使用する自社情報を設定します
          </p>
        </div>
      </div>

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          この情報は見積書や請求書の発行時に使用されます
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>基本情報</CardTitle>
          <CardDescription>
            会社の基本情報を入力してください
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>会社名</FormLabel>
                    <FormControl>
                      <Input placeholder="株式会社サンプル" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="postalCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>郵便番号</FormLabel>
                      <FormControl>
                        <Input placeholder="100-0001" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="representative"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>代表者</FormLabel>
                      <FormControl>
                        <Input placeholder="山田 太郎" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>住所</FormLabel>
                    <FormControl>
                      <Input placeholder="東京都千代田区千代田1-1" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="building"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ビル名</FormLabel>
                    <FormControl>
                      <Input placeholder="サンプルビル 10F" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>電話番号</FormLabel>
                      <FormControl>
                        <Input placeholder="03-1234-5678" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="fax"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>FAX番号</FormLabel>
                      <FormControl>
                        <Input placeholder="03-1234-5679" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="remarks"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>備考</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="その他の情報を入力してください" 
                        className="min-h-[100px]"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end">
                <Button type="submit" disabled={isSaving}>
                  {isSaving ? "保存中..." : "保存"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>請求書設定</CardTitle>
          <CardDescription>
            請求書の発行に必要な情報を入力してください
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="qualifiedInvoiceNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>適格請求書発行事業者登録番号</FormLabel>
                      <FormControl>
                        <Input placeholder="T1234567890123" {...field} />
                      </FormControl>
                      <FormDescription>
                        インボイス制度の登録番号
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex justify-end">
                <Button type="submit" disabled={isSaving}>
                  {isSaving ? "保存中..." : "保存"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>振込先情報</CardTitle>
          <CardDescription>
            請求書に記載する振込先口座情報を入力してください
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="bankName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>銀行名</FormLabel>
                      <FormControl>
                        <Input placeholder="〇〇銀行" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="branchName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>支店名</FormLabel>
                      <FormControl>
                        <Input placeholder="〇〇支店" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="accountType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>口座種別</FormLabel>
                      <FormControl>
                        <Input placeholder="普通" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="accountNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>口座番号</FormLabel>
                      <FormControl>
                        <Input placeholder="1234567" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="accountHolder"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>口座名義</FormLabel>
                    <FormControl>
                      <Input placeholder="カブシキガイシャサンプル" {...field} />
                    </FormControl>
                    <FormDescription>
                      カタカナで入力してください
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end">
                <Button type="submit" disabled={isSaving}>
                  {isSaving ? "保存中..." : "保存"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>会社印</CardTitle>
          <CardDescription>
            見積書などに表示する会社印をアップロードしてください
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {sealImageUrl ? (
              <div className="flex items-center gap-4">
                <div className="relative w-32 h-32 border rounded-lg overflow-hidden">
                  <img 
                    src={sealImageUrl} 
                    alt="会社印" 
                    className="object-contain w-full h-full"
                  />
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleSealDelete}
                >
                  <X className="mr-2 h-4 w-4" />
                  削除
                </Button>
              </div>
            ) : (
              <div className="flex items-center justify-center w-32 h-32 border-2 border-dashed rounded-lg">
                <Building2 className="h-8 w-8 text-muted-foreground" />
              </div>
            )}

            <div>
              <input
                type="file"
                id="seal-upload"
                className="hidden"
                accept="image/png,image/jpeg,image/jpg"
                onChange={handleSealUpload}
                disabled={isUploading}
              />
              <label htmlFor="seal-upload">
                <Button
                  variant="outline"
                  disabled={isUploading}
                  asChild
                >
                  <span>
                    <Upload className="mr-2 h-4 w-4" />
                    {isUploading ? "アップロード中..." : "画像をアップロード"}
                  </span>
                </Button>
              </label>
              <p className="text-sm text-muted-foreground mt-2">
                PNG、JPG、JPEG形式（最大5MB）
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}