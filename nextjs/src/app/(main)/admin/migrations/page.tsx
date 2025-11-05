"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"
import { AlertCircle, CheckCircle, XCircle, Loader2 } from "lucide-react"
import { toast } from "sonner"

export default function AdminMigrationsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [isRunning, setIsRunning] = useState(false)
  const [result, setResult] = useState<any>(null)

  // 認証チェック（管理者のみ）
  useEffect(() => {
    if (status === "loading") return

    if (!session) {
      router.push("/login")
      return
    }

    if (!session.user.isAdmin) {
      router.push("/dashboard")
      return
    }
  }, [session, status, router])

  const runMigration = async () => {
    if (!confirm("実績台帳の集計値マイグレーションを実行しますか？\n\nこの処理は全案件の投下工数を再計算します。")) {
      return
    }

    try {
      setIsRunning(true)
      setResult(null)

      const response = await fetch("/api/admin/migrate-labor-costs", {
        method: "POST",
      })

      const data = await response.json()

      if (!response.ok) {
        toast.error(data.error || "マイグレーションに失敗しました")
        return
      }

      setResult(data)
      toast.success("マイグレーションが完了しました")
    } catch (error) {
      console.error("Migration error:", error)
      toast.error("マイグレーションの実行に失敗しました")
    } finally {
      setIsRunning(false)
    }
  }

  if (status === "loading" || !session) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-[400px]" />
      </div>
    )
  }

  if (!session.user.isAdmin) {
    return null
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">データマイグレーション</h2>
        <p className="text-muted-foreground">
          管理者専用: データベースのマイグレーション処理
        </p>
      </div>

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          この画面は管理者専用です。マイグレーション処理は慎重に実行してください。
        </AlertDescription>
      </Alert>

      {/* 実績台帳マイグレーション */}
      <Card>
        <CardHeader>
          <CardTitle>実績台帳: 集計値の一括計算</CardTitle>
          <CardDescription>
            全案件の投下工数（totalLaborHours、totalLaborCost）を実績データから再計算します。
            <br />
            このマイグレーションは、既存案件に対して一度だけ実行してください。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Button
              onClick={runMigration}
              disabled={isRunning}
              size="lg"
            >
              {isRunning ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  実行中...
                </>
              ) : (
                "マイグレーションを実行"
              )}
            </Button>
          </div>

          {result && (
            <div className="space-y-4 mt-6">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span className="font-semibold">{result.message}</span>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold">{result.totalCount}</div>
                    <div className="text-sm text-muted-foreground">対象案件数</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold text-green-600">{result.successCount}</div>
                    <div className="text-sm text-muted-foreground">成功</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold text-red-600">{result.errorCount}</div>
                    <div className="text-sm text-muted-foreground">失敗</div>
                  </CardContent>
                </Card>
              </div>

              {result.results && result.results.length > 0 && (
                <div className="border rounded-lg p-4">
                  <h4 className="font-semibold mb-2">処理結果（最初の10件）</h4>
                  <div className="space-y-2 max-h-[400px] overflow-y-auto">
                    {result.results.slice(0, 10).map((item: any, index: number) => (
                      <div
                        key={index}
                        className="flex items-center gap-2 text-sm border-b pb-2 last:border-b-0"
                      >
                        {item.status === "success" ? (
                          <>
                            <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                            <div className="flex-1">
                              <span className="font-medium">{item.projectNumber}</span>: {item.hours}h × ¥
                              {item.hourlyRate?.toLocaleString()}/h = ¥{item.laborCost?.toLocaleString()}
                            </div>
                          </>
                        ) : (
                          <>
                            <XCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
                            <div className="flex-1">
                              <span className="font-medium">{item.projectNumber || item.projectId}</span>:{" "}
                              {item.message}
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                  {result.results.length > 10 && (
                    <div className="text-sm text-muted-foreground mt-2">
                      ...他{result.results.length - 10}件
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
