import { Badge } from "@/components/ui/badge"
import { 
  FileText, 
  Send, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  Clock,
  type LucideIcon
} from "lucide-react"

const STATUS_ICONS: Record<string, LucideIcon> = {
  draft: FileText,
  sent: Send,
  accepted: CheckCircle,
  paid: CheckCircle,
  rejected: XCircle,
  cancelled: XCircle,
  expired: Clock,
  overdue: AlertCircle,
}

interface StatusBadgeProps {
  status: string
  config?: {
    label: string
    variant: "default" | "secondary" | "destructive" | "outline" | "success"
  }
  showIcon?: boolean
}

export function StatusBadge({ status, config, showIcon = false }: StatusBadgeProps) {
  const Icon = STATUS_ICONS[status]

  // configがundefinedの場合のフォールバック
  const defaultConfig = {
    label: status || "不明",
    variant: "secondary" as const
  }

  const finalConfig = config || defaultConfig

  // Map "success" variant to "default" with green color styling
  const badgeVariant = finalConfig.variant === "success" ? "default" : finalConfig.variant

  return (
    <Badge
      variant={badgeVariant as "default" | "secondary" | "destructive" | "outline"}
      className={finalConfig.variant === "success" ? "bg-green-500 hover:bg-green-600" : ""}
    >
      {showIcon && Icon && <Icon className="mr-1 h-3 w-3" />}
      {finalConfig.label}
    </Badge>
  )
}