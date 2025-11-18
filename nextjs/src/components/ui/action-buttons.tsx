import * as React from "react"
import { Button } from "@/components/ui/button"
import { Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface DeleteButtonProps {
  onClick: () => void
  className?: string
  disabled?: boolean
}

/**
 * Excel風のコンパクトな削除ボタン
 * 統一されたスタイルで削除アクションを提供
 */
export function DeleteButton({ onClick, className, disabled }: DeleteButtonProps) {
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={onClick}
      disabled={disabled}
      className={cn("text-red-600 hover:text-red-700 h-7 px-2", className)}
    >
      <Trash2 className="h-3.5 w-3.5" />
    </Button>
  )
}
