"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { DollarSign, Users, Server, Clock, TrendingUp, Percent } from "lucide-react"
import type { OverallSummary } from "@/hooks/use-ledger-summary"

interface OverallSummaryCardProps {
  data?: OverallSummary
  isLoading?: boolean
}

function getProfitRateColor(rate: number): string {
  if (rate >= 50) return "text-green-600 font-semibold"
  if (rate >= 30) return "text-green-500 font-semibold"
  if (rate >= 10) return "text-yellow-600 font-semibold"
  if (rate >= 0) return "text-orange-600 font-semibold"
  return "text-red-600 font-semibold"
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("ja-JP", {
    style: "currency",
    currency: "JPY",
    minimumFractionDigits: 0,
  }).format(value)
}

interface SummaryItemProps {
  label: string
  value: string
  icon: React.ReactNode
  valueClassName?: string
  large?: boolean
}

function SummaryItem({ label, value, icon, valueClassName = "", large = false }: SummaryItemProps) {
  return (
    <div className="flex flex-col space-y-2">
      <div className="flex items-center text-sm text-muted-foreground">
        <span className="mr-2">{icon}</span>
        {label}
      </div>
      <div className={`${large ? "text-2xl" : "text-xl"} font-bold ${valueClassName}`}>
        {value}
      </div>
    </div>
  )
}

function SummarySkeleton() {
  return (
    <Card>
      <CardHeader>
        <div className="h-6 w-32 bg-gray-200 rounded animate-pulse" />
        <div className="h-4 w-48 bg-gray-200 rounded animate-pulse" />
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="space-y-2">
              <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
              <div className="h-6 w-32 bg-gray-200 rounded animate-pulse" />
            </div>
          ))}
        </div>
        <Separator className="my-4" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2].map((i) => (
            <div key={i} className="space-y-2">
              <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
              <div className="h-8 w-40 bg-gray-200 rounded animate-pulse" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

export function OverallSummaryCard({ data, isLoading }: OverallSummaryCardProps) {
  if (isLoading) {
    return <SummarySkeleton />
  }

  if (!data) {
    return null
  }

  const profitRateColor = getProfitRateColor(data.averageGrossProfitRate)

  return (
    <Card>
      <CardHeader>
        <CardTitle>全体サマリ</CardTitle>
        <CardDescription>
          表示中の {data.projectCount} 件の案件の集計結果
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <SummaryItem
            label="総発注金額"
            value={formatCurrency(data.totalOrderAmount)}
            icon={<DollarSign className="h-4 w-4" />}
          />
          <SummaryItem
            label="総外注費"
            value={formatCurrency(data.totalOutsourcingCost)}
            icon={<Users className="h-4 w-4" />}
          />
          <SummaryItem
            label="総サーバー・ドメイン代"
            value={formatCurrency(data.totalServerDomainCost)}
            icon={<Server className="h-4 w-4" />}
          />
          <SummaryItem
            label="総投下工数"
            value={formatCurrency(data.totalLaborCost)}
            icon={<Clock className="h-4 w-4" />}
          />
        </div>
        <Separator className="my-4" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SummaryItem
            label="総粗利"
            value={formatCurrency(data.totalGrossProfit)}
            valueClassName={data.totalGrossProfit < 0 ? "text-red-600" : "text-green-600"}
            icon={<TrendingUp className="h-4 w-4" />}
            large
          />
          <SummaryItem
            label="平均粗利率"
            value={`${data.averageGrossProfitRate.toFixed(1)}%`}
            valueClassName={profitRateColor}
            icon={<Percent className="h-4 w-4" />}
            large
          />
        </div>
      </CardContent>
    </Card>
  )
}
