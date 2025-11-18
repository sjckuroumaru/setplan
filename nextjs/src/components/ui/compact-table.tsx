import * as React from "react"
import { cn } from "@/lib/utils"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

/**
 * Excel風のコンパクトなTable
 * 実績台帳スタイルを踏襲したTableコンポーネント
 */
const CompactTable = React.forwardRef<
  HTMLTableElement,
  React.HTMLAttributes<HTMLTableElement>
>(({ className, ...props }, ref) => (
  <Table
    ref={ref}
    className={cn("text-xs", className)}
    {...props}
  />
))
CompactTable.displayName = "CompactTable"

/**
 * Excel風のコンパクトなTableRow
 * hover効果付き
 */
const CompactTableRow = React.forwardRef<
  HTMLTableRowElement,
  React.HTMLAttributes<HTMLTableRowElement>
>(({ className, ...props }, ref) => (
  <TableRow
    ref={ref}
    className={cn("hover:bg-muted/40", className)}
    {...props}
  />
))
CompactTableRow.displayName = "CompactTableRow"

export { CompactTable, CompactTableRow, TableBody, TableCell, TableHead, TableHeader }
