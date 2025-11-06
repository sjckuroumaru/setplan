"use client"

import { useEffect, useState, useRef } from "react"
import { useForm } from "react-hook-form"
import Image from "next/image"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
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
import { Upload, X, Image as ImageIcon } from "lucide-react"
import { toast } from "sonner"

const baseUserFormSchema = z.object({
  employeeNumber: z.string().min(1, "社員番号は必須です"),
  username: z.string().min(1, "ユーザー名は必須です"),
  email: z.string().email("有効なメールアドレスを入力してください"),
  lastName: z.string().min(1, "姓は必須です"),
  firstName: z.string().min(1, "名は必須です"),
  departmentId: z.string().nullable().optional(),
  isAdmin: z.boolean().default(false),
  status: z.enum(["active", "inactive"]).default("active"),
})

const createUserFormSchema = baseUserFormSchema.extend({
  password: z.string().min(6, "パスワードは6文字以上で入力してください"),
})

const editUserFormSchema = baseUserFormSchema.extend({
  password: z
    .string()
    .refine(
      (val) => val.length === 0 || val.length >= 6,
      "パスワードは6文字以上で入力してください"
    )
    .optional(),
})

type CreateUserFormValues = z.infer<typeof createUserFormSchema>
type EditUserFormValues = z.infer<typeof editUserFormSchema>
type UserFormValues = CreateUserFormValues | EditUserFormValues

interface User {
  id: string
  employeeNumber: string
  username: string
  email: string
  lastName: string
  firstName: string
  departmentId: string | null
  departmentRef?: {
    id: string
    name: string
  } | null
  isAdmin: boolean
  status: string
  sealImagePath?: string | null
}

interface Department {
  id: string
  name: string
}

interface UserFormProps {
  user?: User
  onSubmit: (data: UserFormValues) => Promise<void>
  onCancel: () => void
  isLoading: boolean
  isEdit?: boolean
}

export function UserForm({ user, onSubmit, onCancel, isLoading, isEdit = false }: UserFormProps) {
  // 編集モードかどうかに応じて適切なスキーマを選択
  const formSchema = isEdit ? editUserFormSchema : createUserFormSchema
  const [sealImageUrl, setSealImageUrl] = useState<string | null>(user?.sealImagePath || null)
  const [isUploadingSeal, setIsUploadingSeal] = useState(false)
  const [departments, setDepartments] = useState<Department[]>([])
  const [loadingDepartments, setLoadingDepartments] = useState(false)

  // データ設定済みフラグと前回のユーザーID
  const hasInitializedData = useRef(false)
  const previousUserId = useRef<string | null>(null)
  
  const form = useForm<UserFormValues>({
    resolver: zodResolver(formSchema as any),
    defaultValues: {
      employeeNumber: user?.employeeNumber || "",
      username: user?.username || "",
      email: user?.email || "",
      password: "",
      lastName: user?.lastName || "",
      firstName: user?.firstName || "",
      departmentId: user?.departmentId || null,
      isAdmin: user?.isAdmin || false,
      status: (user?.status as "active" | "inactive") || "active",
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

  useEffect(() => {
    // ユーザーIDが変わった場合は、フラグをリセット
    if (previousUserId.current !== user?.id) {
      hasInitializedData.current = false
      previousUserId.current = user?.id || null
    }

    // 既にデータを設定済み、またはuserがない場合はスキップ
    if (hasInitializedData.current || !user) {
      return
    }

    hasInitializedData.current = true

    form.reset({
      employeeNumber: user.employeeNumber,
      username: user.username,
      email: user.email,
      password: "",
      lastName: user.lastName,
      firstName: user.firstName,
      departmentId: user.departmentId || null,
      isAdmin: user.isAdmin,
      status: user.status as "active" | "inactive",
    })
    setSealImageUrl(user.sealImagePath || null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  const handleSubmit = async (data: UserFormValues) => {
    // 編集モードでパスワードが空の場合は除外
    if (isEdit && !data.password) {
      const { password: _password, ...dataWithoutPassword } = data
      await onSubmit(dataWithoutPassword as UserFormValues)
    } else {
      await onSubmit(data)
    }
  }

  const handleSealUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!user?.id) return
    
    const file = e.target.files?.[0]
    if (!file) return

    // ファイルサイズチェック（5MB以下）
    if (file.size > 5 * 1024 * 1024) {
      toast.error("ファイルサイズは5MB以下にしてください")
      return
    }

    // ファイルタイプチェック
    const allowedTypes = ["image/png", "image/jpeg", "image/jpg", "image/webp"]
    if (!allowedTypes.includes(file.type)) {
      toast.error("PNG、JPEG、WebP形式の画像のみアップロード可能です")
      return
    }

    try {
      setIsUploadingSeal(true)
      const formData = new FormData()
      formData.append("file", file)

      const response = await fetch(`/api/users/${user.id}/seal`, {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        throw new Error("アップロードに失敗しました")
      }

      const data = await response.json()
      setSealImageUrl(data.sealImagePath)
      toast.success("押印画像をアップロードしました")
    } catch (error) {
      console.error("Upload error:", error)
      toast.error("押印画像のアップロードに失敗しました")
    } finally {
      setIsUploadingSeal(false)
    }
  }

  const handleSealRemove = async () => {
    if (!user?.id) return

    try {
      setIsUploadingSeal(true)
      const response = await fetch(`/api/users/${user.id}/seal`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error("削除に失敗しました")
      }

      setSealImageUrl(null)
      toast.success("押印画像を削除しました")
    } catch (error) {
      console.error("Delete error:", error)
      toast.error("押印画像の削除に失敗しました")
    } finally {
      setIsUploadingSeal(false)
    }
  }

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>
          {isEdit ? "ユーザー編集" : "新規ユーザー作成"}
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
                  name="employeeNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>社員番号 *</FormLabel>
                      <FormControl>
                        <Input placeholder="EMP001" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>姓 *</FormLabel>
                      <FormControl>
                        <Input placeholder="山田" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>名 *</FormLabel>
                      <FormControl>
                        <Input placeholder="太郎" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="departmentId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>部署・チーム</FormLabel>
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
              </div>

              {/* アカウント情報 */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">アカウント情報</h3>
                
                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>ユーザー名 *</FormLabel>
                      <FormControl>
                        <Input placeholder="yamada.taro" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>メールアドレス *</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="yamada@example.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        パスワード {isEdit ? "(変更する場合のみ入力)" : "*"}
                      </FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="••••••••" {...field} />
                      </FormControl>
                      <FormDescription>
                        {isEdit 
                          ? "空欄の場合、パスワードは変更されません"
                          : "6文字以上で入力してください"
                        }
                      </FormDescription>
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
                          <SelectItem value="active">有効</SelectItem>
                          <SelectItem value="inactive">無効</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="isAdmin"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">管理者権限</FormLabel>
                        <FormDescription>
                          管理者権限を持つユーザーは、すべてのユーザー管理機能にアクセスできます
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* 押印画像 */}
            {isEdit && (
              <div className="space-y-4">
                <h3 className="text-lg font-medium">押印画像</h3>
                <div className="flex items-center gap-4">
                  {sealImageUrl ? (
                    <div className="relative">
                      <div className="relative w-24 h-24 border rounded-lg overflow-hidden bg-gray-50">
                        <Image
                          src={sealImageUrl}
                          alt="押印"
                          fill
                          className="object-contain"
                        />
                      </div>
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute -top-2 -right-2 h-6 w-6"
                        onClick={handleSealRemove}
                        disabled={isUploadingSeal}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="w-24 h-24 border-2 border-dashed rounded-lg flex items-center justify-center bg-gray-50">
                      <ImageIcon className="h-8 w-8 text-gray-400" />
                    </div>
                  )}
                  
                  <div className="flex-1">
                    <input
                      type="file"
                      id="seal-upload"
                      className="hidden"
                      accept="image/png,image/jpeg,image/jpg,image/webp"
                      onChange={handleSealUpload}
                      disabled={isUploadingSeal}
                    />
                    <label htmlFor="seal-upload">
                      <Button
                        type="button"
                        variant="outline"
                        disabled={isUploadingSeal}
                        onClick={() => document.getElementById("seal-upload")?.click()}
                      >
                        <Upload className="mr-2 h-4 w-4" />
                        {isUploadingSeal ? "アップロード中..." : "押印画像をアップロード"}
                      </Button>
                    </label>
                    <p className="text-sm text-muted-foreground mt-2">
                      PNG、JPEG、WebP形式（5MB以下）
                    </p>
                  </div>
                </div>
              </div>
            )}

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