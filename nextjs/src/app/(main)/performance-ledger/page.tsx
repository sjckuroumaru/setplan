"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { usePerformanceLedger } from "@/hooks/use-performance-ledger"
import { useLedgerSummary } from "@/hooks/use-ledger-summary"
import { usePagination } from "@/hooks/use-pagination"
import { useDepartments } from "@/hooks/use-departments"
import { config } from "@/lib/config"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Alert,
  AlertDescription,
} from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"
import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown
} from "lucide-react"
import { OverallSummaryCard } from "@/components/performance-ledger/overall-summary"
import { TeamSummaryTable } from "@/components/performance-ledger/team-summary-table"

const projectTypeLabels = {
  development: "開発",
  ses: "SES",
  maintenance: "保守",
  other: "その他",
}

const statusLabels = {
  planning: "計画中",
  developing: "開発中",
  active: "稼働中",
  suspended: "停止中",
  completed: "完了",
}

export default function PerformanceLedgerPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const {
    currentPage,
    pagination,
    setPagination,
    goToNextPage,
    goToPreviousPage,
    resetToFirstPage,
    hasPreviousPage,
    hasNextPage,
  } = usePagination({ defaultLimit: config.pagination.defaultLimit })

  const [projectTypeFilter, setProjectTypeFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState<string[]>(["planning", "developing", "active"])
  const [departmentFilter, setDepartmentFilter] = useState("all")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [sortBy, setSortBy] = useState("issueDate")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")

  // SWRフックでデータ取得
  const { data, pagination: swrPagination, isLoading, isError } = usePerformanceLedger({
    page: currentPage,
    limit: pagination.limit,
    projectType: projectTypeFilter !== "all" ? projectTypeFilter : undefined,
    statuses: statusFilter.length > 0 ? statusFilter : undefined,
    departmentId: departmentFilter !== "all" ? departmentFilter : undefined,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
    sortBy,
    sortOrder,
  })

  // サマリデータ取得
  const {
    overall,
    byTeam,
    isLoading: isSummaryLoading,
  } = useLedgerSummary({
    projectType: projectTypeFilter !== "all" ? projectTypeFilter : undefined,
    statuses: statusFilter.length > 0 ? statusFilter : undefined,
    departmentId: departmentFilter !== "all" ? departmentFilter : undefined,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
  })

  // 部門データ取得
  const { departments } = useDepartments({ limit: 1000 })

  // 認証チェック
  useEffect(() => {
    if (status === "loading") return

    if (!session) {
      router.push("/login")
      return
    }
  }, [session, status, router])

  // SWRのpaginationで更新
  useEffect(() => {
    if (swrPagination) {
      setPagination({
        page: swrPagination.currentPage,
        limit: pagination.limit,
        total: swrPagination.totalCount,
        totalPages: swrPagination.totalPages,
      })
    }
  }, [swrPagination, setPagination, pagination.limit])

  // フィルター変更時にページを1に戻す
  useEffect(() => {
    if (session) {
      resetToFirstPage()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectTypeFilter, statusFilter, departmentFilter, startDate, endDate, sortBy, sortOrder])

  // 日付フォーマット
  const formatDate = (dateString: string | null) => {
    if (!dateString) return "-"
    return new Date(dateString).toLocaleDateString("ja-JP")
  }

  // 金額フォーマット
  const formatCurrency = (amount: number) => {
    return `¥${amount.toLocaleString()}`
  }

  // 粗利率の色を取得
  const getProfitRateColor = (rate: number) => {
    if (rate < 0) return "text-red-700 font-semibold" // マイナス: 濃い赤色
    if (rate < 10) return "text-red-500" // 0-10%: 赤色
    if (rate < 30) return "text-yellow-600" // 10-30%: 黄色
    return "text-green-600" // 30%以上: 緑色
  }

  // ステータスフィルターの切り替え
  const handleStatusToggle = (status: string) => {
    setStatusFilter((prev) => {
      if (prev.includes(status)) {
        return prev.filter((s) => s !== status)
      } else {
        return [...prev, status]
      }
    })
  }

  // ソート切り替え
  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc")
    } else {
      setSortBy(column)
      setSortOrder("desc")
    }
  }

  // ソートアイコン表示
  const SortIcon = ({ column }: { column: string }) => {
    if (sortBy !== column) {
      return <ArrowUpDown className="ml-1 h-3 w-3 inline opacity-50" />
    }
    return sortOrder === "asc"
      ? <ArrowUp className="ml-1 h-3 w-3 inline" />
      : <ArrowDown className="ml-1 h-3 w-3 inline" />
  }

  if (status === "loading" || !session) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-[600px]" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">実績台帳</h2>
          <p className="text-muted-foreground">
            案件の収益性を分析・管理
          </p>
        </div>
      </div>

      {isError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{isError.message || "エラーが発生しました"}</AlertDescription>
        </Alert>
      )}

      {/* フィルター */}
      <Card>
        <CardHeader>
          <CardTitle>フィルター</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-2 md:col-span-1 lg:col-span-1">
              <Label htmlFor="project-type-filter">案件種別</Label>
              <Select value={projectTypeFilter} onValueChange={setProjectTypeFilter}>
                <SelectTrigger id="project-type-filter">
                  <SelectValue placeholder="案件種別" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">すべて</SelectItem>
                  <SelectItem value="development">開発</SelectItem>
                  <SelectItem value="ses">SES</SelectItem>
                  <SelectItem value="maintenance">保守</SelectItem>
                  <SelectItem value="other">その他</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 md:col-span-1 lg:col-span-1">
              <Label htmlFor="department-filter">チーム</Label>
              <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                <SelectTrigger id="department-filter">
                  <SelectValue placeholder="チーム" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">すべて</SelectItem>
                  {departments.map((department) => (
                    <SelectItem key={department.id} value={department.id}>
                      {department.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 md:col-span-1 lg:col-span-2">
              <Label>発行日期間</Label>
              <div className="flex gap-2">
                <Input
                  type="date"
                  placeholder="開始日"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
                <Input
                  type="date"
                  placeholder="終了日"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2 md:col-span-2 lg:col-span-3">
              <Label>ステータス</Label>
              <div className="flex flex-wrap gap-4">
                {Object.entries(statusLabels).map(([value, label]) => (
                  <div key={value} className="flex items-center space-x-2">
                    <Checkbox
                      id={`status-${value}`}
                      checked={statusFilter.includes(value)}
                      onCheckedChange={() => handleStatusToggle(value)}
                    />
                    <Label
                      htmlFor={`status-${value}`}
                      className="text-sm font-normal cursor-pointer"
                    >
                      {label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* サマリセクション */}
      <div className="space-y-4">
        <OverallSummaryCard data={overall} isLoading={isSummaryLoading} />
        <TeamSummaryTable data={byTeam} isLoading={isSummaryLoading} />
      </div>

      {/* 実績台帳テーブル */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table className="text-xs">
              <TableHeader>
                <TableRow>
                  <TableHead className="cursor-pointer" onClick={() => handleSort("projectNumber")}>
                    案件番号<SortIcon column="projectNumber" />
                  </TableHead>
                  <TableHead className="cursor-pointer min-w-[150px]" onClick={() => handleSort("projectName")}>
                    案件名<SortIcon column="projectName" />
                  </TableHead>
                  <TableHead className="cursor-pointer" onClick={() => handleSort("issueDate")}>
                    発行日<SortIcon column="issueDate" />
                  </TableHead>
                  <TableHead>発注先</TableHead>
                  <TableHead>種別</TableHead>
                  <TableHead>記入者</TableHead>
                  <TableHead>チーム</TableHead>
                  <TableHead>ステータス</TableHead>
                  <TableHead className="min-w-[120px]">メモ</TableHead>
                  <TableHead className="text-right cursor-pointer" onClick={() => handleSort("orderAmount")}>
                    発注金額<SortIcon column="orderAmount" />
                  </TableHead>
                  <TableHead>納期</TableHead>
                  <TableHead>納品日</TableHead>
                  <TableHead>請求可能日</TableHead>
                  <TableHead className="text-right">外注費</TableHead>
                  <TableHead className="text-right">サーバー費</TableHead>
                  <TableHead className="text-right cursor-pointer" onClick={() => handleSort("laborCost")}>
                    投下工数<SortIcon column="laborCost" />
                  </TableHead>
                  <TableHead className="text-right cursor-pointer" onClick={() => handleSort("grossProfit")}>
                    粗利<SortIcon column="grossProfit" />
                  </TableHead>
                  <TableHead className="text-right cursor-pointer" onClick={() => handleSort("grossProfitRate")}>
                    粗利率<SortIcon column="grossProfitRate" />
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 10 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 18 }).map((_, j) => (
                        <TableCell key={j}>
                          <Skeleton className="h-4 w-full" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : data.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={18} className="text-center py-8">
                      データが見つかりません
                    </TableCell>
                  </TableRow>
                ) : (
                  data.map((item) => (
                    <TableRow key={item.projectId}>
                      <TableCell className="font-medium">{item.projectNumber}</TableCell>
                      <TableCell className="font-medium">{item.projectName}</TableCell>
                      <TableCell>{formatDate(item.issueDate)}</TableCell>
                      <TableCell>{item.supplierName || "-"}</TableCell>
                      <TableCell>
                        {projectTypeLabels[item.projectType as keyof typeof projectTypeLabels] || item.projectType}
                      </TableCell>
                      <TableCell>{item.editorName || "-"}</TableCell>
                      <TableCell>{item.teamName || "-"}</TableCell>
                      <TableCell>
                        {statusLabels[item.status as keyof typeof statusLabels] || item.status}
                      </TableCell>
                      <TableCell className="max-w-[120px] truncate" title={item.memo || ""}>
                        {item.memo || "-"}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(item.orderAmount)}
                      </TableCell>
                      <TableCell>{formatDate(item.deliveryDeadline)}</TableCell>
                      <TableCell>{formatDate(item.deliveryDate)}</TableCell>
                      <TableCell>{formatDate(item.invoiceableDate)}</TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(item.outsourcingCost)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(item.serverDomainCost)}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(item.laborCost)}
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {formatCurrency(item.grossProfit)}
                      </TableCell>
                      <TableCell className={`text-right font-semibold ${getProfitRateColor(item.grossProfitRate)}`}>
                        {item.grossProfitRate.toFixed(1)}%
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* ページネーション */}
      {!isLoading && data.length > 0 && pagination && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            {pagination.total}件中 {((currentPage - 1) * pagination.limit) + 1}-
            {Math.min(currentPage * pagination.limit, pagination.total)}件を表示
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={goToPreviousPage}
              disabled={!hasPreviousPage}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              前へ
            </Button>
            <div className="text-sm">
              {currentPage} / {pagination.totalPages}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={goToNextPage}
              disabled={!hasNextPage}
            >
              次へ
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
