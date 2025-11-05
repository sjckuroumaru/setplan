"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useSession } from "next-auth/react"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  Users,
  Briefcase,
  Calendar,
  CheckSquare,
  GitBranch,
  Building2,
  FileText,
  Receipt,
  ShoppingCart,
  Settings,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Files,
  TrendingUp,
  BarChart3,
  type LucideIcon
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"

interface SidebarProps {
  isOpen?: boolean
  onClose?: () => void
  className?: string
}

interface MenuItem {
  title: string
  href?: string
  icon: LucideIcon
  adminOnly?: boolean
  subItems?: {
    title: string
    href: string
    icon?: LucideIcon
  }[]
}

const menuItems: MenuItem[] = [
  {
    title: "ダッシュボード",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "予定実績",
    href: "/schedules",
    icon: Calendar,
    subItems: [
      { title: "一覧", href: "/schedules" },
      { title: "カレンダー", href: "/schedules/calendar" },
      { title: "グラフ", href: "/schedules/chart" },
    ],
  },
  {
    title: "課題管理",
    href: "/issues",
    icon: CheckSquare,
  },
  {
    title: "ガントチャート",
    href: "/gantt",
    icon: GitBranch,
  },
  {
    title: "EVM分析",
    href: "/evm-analysis",
    icon: TrendingUp,
  },
  {
    title: "実績台帳",
    href: "/performance-ledger",
    icon: BarChart3,
  },
  {
    title: "書類管理",
    icon: Files,
    subItems: [
      { 
        title: "見積書管理",
        href: "/estimates",
        icon: FileText,
      },
      {
        title: "発注書管理",
        href: "/purchase-orders",
        icon: ShoppingCart,
      },
      {
        title: "請求書管理",
        href: "/invoices",
        icon: Receipt,
      }
    ],
  },
  {
    title: "設定",
    icon: Settings,
    subItems: [
      {
        title: "顧客管理",
        href: "/customers",
        icon: Building2,
      },
      {
        title: "案件管理",
        href: "/projects",
        icon: Briefcase,
      },
      {
        title: "部署・チーム管理",
        href: "/settings/departments",
        icon: Users,
      },
      {
        title: "ユーザー管理",
        href: "/users",
        icon: Users,
      },
      {
        title: "自社情報",
        href: "/settings/company",
        icon: Settings,
      }
    ],
  },
]

export function Sidebar({ isOpen = true, onClose, className }: SidebarProps) {
  const pathname = usePathname()
  const { data: session } = useSession()
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [expandedItems, setExpandedItems] = useState<string[]>([])
  
  // 管理者権限を持つユーザーか確認
  const isAdmin = session?.user?.isAdmin || false

  // アコーディオンの開閉を切り替える
  const toggleExpanded = (title: string) => {
    setExpandedItems(prev =>
      prev.includes(title)
        ? prev.filter(item => item !== title)
        : [...prev, title]
    )
  }

  return (
    <>
      {/* モバイル用オーバーレイ */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={onClose}
        />
      )}

      {/* サイドバー本体 */}
      <aside
        className={cn(
          "fixed left-0 top-0 z-50 h-full border-r bg-background transition-all md:relative md:translate-x-0 md:z-0",
          isCollapsed ? "w-16" : "w-64",
          isOpen ? "translate-x-0" : "-translate-x-full",
          className
        )}
      >
        <div className="flex h-16 items-center justify-between border-b px-4 md:hidden">
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        <ScrollArea className="h-[calc(100vh-4rem)] md:h-full">
          {/* 折りたたみボタン - デスクトップのみ */}
          <div className="hidden md:flex justify-end p-2 border-b">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="h-8 w-8"
            >
              {isCollapsed ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <ChevronLeft className="h-4 w-4" />
              )}
            </Button>
          </div>
          <nav className="space-y-1 p-4">
            {menuItems
              .filter((item) => {
                // adminOnlyまたは設定メニューは管理者のみ表示
                if (item.adminOnly || item.title === "設定") {
                  return isAdmin
                }
                return true
              })
              .map((item) => {
                const Icon = item.icon
                const isActive = item.href 
                  ? pathname === item.href
                  : item.subItems?.some(sub => pathname === sub.href)
                const isExpanded = expandedItems.includes(item.title)

                return (
                <div key={item.title}>
                  {item.href ? (
                    // 通常のメニューアイテム（リンクあり）
                    <Link
                      href={item.href}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground",
                        isActive && "bg-accent text-accent-foreground",
                        isCollapsed && "justify-center px-2"
                      )}
                      title={isCollapsed ? item.title : undefined}
                    >
                      <Icon className="h-4 w-4" />
                      {!isCollapsed && item.title}
                    </Link>
                  ) : (
                    // アコーディオンメニュー（リンクなし）
                    <button
                      onClick={() => toggleExpanded(item.title)}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground",
                        isActive && "bg-accent text-accent-foreground",
                        isCollapsed && "justify-center px-2"
                      )}
                      title={isCollapsed ? item.title : undefined}
                    >
                      <Icon className="h-4 w-4" />
                      {!isCollapsed && (
                        <>
                          <span className="flex-1 text-left">{item.title}</span>
                          <ChevronDown
                            className={cn(
                              "h-4 w-4 transition-transform",
                              isExpanded && "rotate-180"
                            )}
                          />
                        </>
                      )}
                    </button>
                  )}
                  
                  {/* サブアイテム */}
                  {item.subItems && !isCollapsed && isExpanded && (
                    <div className="ml-7 mt-1 space-y-1">
                      {item.subItems.map((subItem) => {
                        const SubIcon = subItem.icon
                        return (
                          <Link
                            key={subItem.href}
                            href={subItem.href}
                            className={cn(
                              "flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm transition-colors hover:bg-accent hover:text-accent-foreground",
                              pathname === subItem.href && "bg-accent text-accent-foreground"
                            )}
                          >
                            {SubIcon && <SubIcon className="h-3.5 w-3.5" />}
                            {subItem.title}
                          </Link>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </nav>
        </ScrollArea>
      </aside>
    </>
  )
}