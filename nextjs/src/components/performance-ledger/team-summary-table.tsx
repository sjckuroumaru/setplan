"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ChevronDown, ChevronRight, ArrowUpDown } from "lucide-react"
import type { TeamSummary } from "@/hooks/use-ledger-summary"

interface TeamSummaryTableProps {
  data: TeamSummary[]
  isLoading?: boolean
}

type SortKey = keyof TeamSummary
type SortOrder = "asc" | "desc"

function getProfitRateColor(rate: number): string {
  if (rate >= 50) return "bg-green-600 text-white"
  if (rate >= 30) return "bg-green-500 text-white"
  if (rate >= 10) return "bg-yellow-400 text-black"
  if (rate >= 0) return "bg-orange-500 text-white"
  return "bg-red-600 text-white"
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("ja-JP", {
    style: "currency",
    currency: "JPY",
    minimumFractionDigits: 0,
  }).format(value)
}

function SummarySkeleton() {
  return (
    <Card>
      <CardHeader>
        <div className="h-6 w-32 bg-gray-200 rounded animate-pulse" />
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-gray-200 rounded animate-pulse" />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

interface TeamRowProps {
  team: TeamSummary
  isExpanded: boolean
  onToggle: () => void
}

function TeamRow({ team, isExpanded, onToggle }: TeamRowProps) {
  const profitRateColorClass = getProfitRateColor(team.grossProfitRate)

  return (
    <>
      <TableRow
        className="cursor-pointer hover:bg-muted/50"
        onClick={onToggle}
      >
        <TableCell>
          <div className="flex items-center">
            {isExpanded ? (
              <ChevronDown className="h-4 w-4 mr-2" />
            ) : (
              <ChevronRight className="h-4 w-4 mr-2" />
            )}
            <span className="font-medium">{team.departmentName}</span>
          </div>
        </TableCell>
        <TableCell className="text-right">{team.projectCount} 件</TableCell>
        <TableCell className="text-right">{formatCurrency(team.orderAmount)}</TableCell>
        <TableCell className="text-right">
          <span className={team.grossProfit < 0 ? "text-red-600 font-semibold" : "text-green-600 font-semibold"}>
            {formatCurrency(team.grossProfit)}
          </span>
        </TableCell>
        <TableCell className="text-right">
          <span className={`px-2 py-1 rounded text-sm font-semibold ${profitRateColorClass}`}>
            {team.grossProfitRate.toFixed(1)}%
          </span>
        </TableCell>
        <TableCell className="text-right">{team.compositionRate.toFixed(1)}%</TableCell>
      </TableRow>
      {isExpanded && (
        <TableRow>
          <TableCell colSpan={6} className="bg-muted/30">
            <div className="py-4 px-6 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <div className="text-sm text-muted-foreground mb-1">外注費</div>
                <div className="text-lg font-semibold">
                  {formatCurrency(team.outsourcingCost)}
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground mb-1">サーバー・ドメイン代</div>
                <div className="text-lg font-semibold">
                  {formatCurrency(team.serverDomainCost)}
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground mb-1">投下工数</div>
                <div className="text-lg font-semibold">
                  {formatCurrency(team.laborCost)}
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground mb-1">平均案件単価</div>
                <div className="text-lg font-semibold">
                  {formatCurrency(team.averageOrderAmount)}
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground mb-1">平均粗利</div>
                <div className="text-lg font-semibold">
                  {formatCurrency(team.averageGrossProfit)}
                </div>
              </div>
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  )
}

export function TeamSummaryTable({ data, isLoading }: TeamSummaryTableProps) {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; order: SortOrder }>({
    key: "orderAmount",
    order: "desc",
  })

  const toggleRow = (departmentId: string | null) => {
    const key = departmentId || "unassigned"
    setExpandedRows((prev) => {
      const next = new Set(prev)
      if (next.has(key)) {
        next.delete(key)
      } else {
        next.add(key)
      }
      return next
    })
  }

  const handleSort = (key: SortKey) => {
    setSortConfig((current) => ({
      key,
      order: current.key === key && current.order === "desc" ? "asc" : "desc",
    }))
  }

  if (isLoading) {
    return <SummarySkeleton />
  }

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>チーム別サマリ</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            表示するデータがありません
          </div>
        </CardContent>
      </Card>
    )
  }

  // ソート処理
  const sortedData = [...data].sort((a, b) => {
    const aValue = a[sortConfig.key]
    const bValue = b[sortConfig.key]

    if (typeof aValue === "string" && typeof bValue === "string") {
      return sortConfig.order === "asc"
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue)
    }

    const aNum = typeof aValue === "number" ? aValue : 0
    const bNum = typeof bValue === "number" ? bValue : 0

    return sortConfig.order === "asc" ? aNum - bNum : bNum - aNum
  })

  // 合計行を計算
  const totalRow: TeamSummary = {
    departmentId: null,
    departmentName: "合計",
    projectCount: data.reduce((sum, t) => sum + t.projectCount, 0),
    orderAmount: data.reduce((sum, t) => sum + t.orderAmount, 0),
    outsourcingCost: data.reduce((sum, t) => sum + t.outsourcingCost, 0),
    serverDomainCost: data.reduce((sum, t) => sum + t.serverDomainCost, 0),
    laborCost: data.reduce((sum, t) => sum + t.laborCost, 0),
    grossProfit: data.reduce((sum, t) => sum + t.grossProfit, 0),
    grossProfitRate: 0,
    compositionRate: 100,
    averageOrderAmount: 0,
    averageGrossProfit: 0,
  }
  totalRow.grossProfitRate =
    totalRow.orderAmount > 0 ? (totalRow.grossProfit / totalRow.orderAmount) * 100 : 0

  const SortButton = ({ column, label }: { column: SortKey; label: string }) => (
    <Button
      variant="ghost"
      size="sm"
      className="-ml-3 h-8 data-[state=open]:bg-accent"
      onClick={() => handleSort(column)}
    >
      <span>{label}</span>
      <ArrowUpDown className="ml-2 h-4 w-4" />
    </Button>
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle>チーム別サマリ</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <SortButton column="departmentName" label="チーム名" />
                </TableHead>
                <TableHead className="text-right">
                  <SortButton column="projectCount" label="案件数" />
                </TableHead>
                <TableHead className="text-right">
                  <SortButton column="orderAmount" label="発注金額" />
                </TableHead>
                <TableHead className="text-right">
                  <SortButton column="grossProfit" label="粗利" />
                </TableHead>
                <TableHead className="text-right">
                  <SortButton column="grossProfitRate" label="粗利率" />
                </TableHead>
                <TableHead className="text-right">
                  <SortButton column="compositionRate" label="構成比" />
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedData.map((team) => (
                <TeamRow
                  key={team.departmentId || "unassigned"}
                  team={team}
                  isExpanded={expandedRows.has(team.departmentId || "unassigned")}
                  onToggle={() => toggleRow(team.departmentId)}
                />
              ))}
              <TableRow className="font-bold bg-muted/50">
                <TableCell>{totalRow.departmentName}</TableCell>
                <TableCell className="text-right">{totalRow.projectCount} 件</TableCell>
                <TableCell className="text-right">{formatCurrency(totalRow.orderAmount)}</TableCell>
                <TableCell className="text-right">
                  <span className={totalRow.grossProfit < 0 ? "text-red-600" : "text-green-600"}>
                    {formatCurrency(totalRow.grossProfit)}
                  </span>
                </TableCell>
                <TableCell className="text-right">{totalRow.grossProfitRate.toFixed(1)}%</TableCell>
                <TableCell className="text-right">{totalRow.compositionRate.toFixed(1)}%</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
