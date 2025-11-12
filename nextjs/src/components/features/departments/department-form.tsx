"use client"

import { useEffect, useRef } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Textarea } from "@/components/ui/textarea"

const departmentFormSchema = z.object({
  name: z.string().min(1, "部署・チーム名は必須です"),
  sharedNotes: z
    .string()
    .max(500, "共有事項は500文字以内で入力してください")
    .optional(),
})

type DepartmentFormValues = z.infer<typeof departmentFormSchema>

interface Department {
  id: string
  name: string
  sharedNotes?: string | null
  createdAt?: string
  updatedAt?: string
}

interface DepartmentFormProps {
  department?: Department
  onSubmit: (data: DepartmentFormValues) => Promise<void>
  onCancel: () => void
  isLoading: boolean
  isEdit?: boolean
}

export function DepartmentForm({ department, onSubmit, onCancel, isLoading, isEdit = false }: DepartmentFormProps) {
  // データ設定済みフラグと前回の部署ID
  const hasInitializedData = useRef(false)
  const previousDepartmentId = useRef<string | null>(null)

  const form = useForm<DepartmentFormValues>({
    resolver: zodResolver(departmentFormSchema),
    defaultValues: {
      name: department?.name || "",
      sharedNotes: department?.sharedNotes || "",
    },
  })

  useEffect(() => {
    // 部署IDが変わった場合は、フラグをリセット
    if (previousDepartmentId.current !== department?.id) {
      hasInitializedData.current = false
      previousDepartmentId.current = department?.id || null
    }

    // 既にデータを設定済み、またはdepartmentがない場合はスキップ
    if (hasInitializedData.current || !department) {
      return
    }

    hasInitializedData.current = true

    form.reset({
      name: department.name,
      sharedNotes: department.sharedNotes || "",
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [department?.id])

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>
          {isEdit ? "部署・チーム編集" : "新規部署・チーム作成"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>部署・チーム名 *</FormLabel>
                  <FormControl>
                    <Input placeholder="例: システム開発部" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="sharedNotes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>共有事項（500文字まで）</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="部署で共有したい情報を記入してください"
                      className="min-h-[120px]"
                      maxLength={500}
                      {...field}
                    />
                  </FormControl>
                  <div className="text-xs text-muted-foreground text-right">
                    {(field.value?.length || 0)}/500
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

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
