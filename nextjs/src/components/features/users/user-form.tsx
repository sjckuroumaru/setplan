"use client"

import { useEffect } from "react"
import { useForm } from "react-hook-form"
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

const baseUserFormSchema = z.object({
  employeeNumber: z.string().min(1, "社員番号は必須です"),
  username: z.string().min(1, "ユーザー名は必須です"),
  email: z.string().email("有効なメールアドレスを入力してください"),
  lastName: z.string().min(1, "姓は必須です"),
  firstName: z.string().min(1, "名は必須です"),
  department: z.string().optional(),
  isAdmin: z.boolean().default(false),
  status: z.enum(["active", "inactive"]).default("active"),
})

const createUserFormSchema = baseUserFormSchema.extend({
  password: z.string().min(6, "パスワードは6文字以上で入力してください"),
})

const editUserFormSchema = baseUserFormSchema.extend({
  password: z.string().optional().or(z.literal("")),
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
  department: string | null
  isAdmin: boolean
  status: string
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
  
  const form = useForm<UserFormValues>({
    resolver: zodResolver(formSchema as any),
    defaultValues: {
      employeeNumber: user?.employeeNumber || "",
      username: user?.username || "",
      email: user?.email || "",
      password: "",
      lastName: user?.lastName || "",
      firstName: user?.firstName || "",
      department: user?.department || "",
      isAdmin: user?.isAdmin || false,
      status: (user?.status as "active" | "inactive") || "active",
    },
  })

  useEffect(() => {
    if (user) {
      form.reset({
        employeeNumber: user.employeeNumber,
        username: user.username,
        email: user.email,
        password: "",
        lastName: user.lastName,
        firstName: user.firstName,
        department: user.department || "",
        isAdmin: user.isAdmin,
        status: user.status as "active" | "inactive",
      })
    }
  }, [user, form])

  const handleSubmit = async (data: UserFormValues) => {
    // 編集モードでパスワードが空の場合は除外
    if (isEdit && !data.password) {
      const { password, ...dataWithoutPassword } = data
      await onSubmit(dataWithoutPassword as UserFormValues)
    } else {
      await onSubmit(data)
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
                  name="department"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>部署・チーム</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="例: システム部" 
                          {...field}
                          value={field.value || ""}
                        />
                      </FormControl>
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