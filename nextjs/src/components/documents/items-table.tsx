import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatCurrency } from "@/lib/utils/document"
import { DocumentItem } from "@/types/document"

interface ItemsTableProps {
  items: DocumentItem[]
  showTaxRate?: boolean
}

export function ItemsTable({ items, showTaxRate = false }: ItemsTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>項目</TableHead>
          <TableHead className="text-center">数量</TableHead>
          <TableHead className="text-center">単位</TableHead>
          <TableHead className="text-right">単価</TableHead>
          {showTaxRate && <TableHead className="text-center">税率</TableHead>}
          <TableHead className="text-right">金額</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((item, index) => (
          <TableRow key={item.id || index}>
            <TableCell>{item.name}</TableCell>
            <TableCell className="text-center">
              {parseFloat(item.quantity).toLocaleString("ja-JP")}
            </TableCell>
            <TableCell className="text-center">{item.unit || "-"}</TableCell>
            <TableCell className="text-right">
              {formatCurrency(item.unitPrice)}
            </TableCell>
            {showTaxRate && (
              <TableCell className="text-center">
                {item.taxType === "non-taxable" ? "非課税" : 
                 item.taxType === "tax-included" ? "税込" : 
                 `${item.taxRate || 10}%`}
              </TableCell>
            )}
            <TableCell className="text-right">
              {formatCurrency(item.amount)}
            </TableCell>
          </TableRow>
        ))}
        {items.length === 0 && (
          <TableRow>
            <TableCell 
              colSpan={showTaxRate ? 6 : 5} 
              className="text-center text-muted-foreground py-8"
            >
              明細がありません
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  )
}