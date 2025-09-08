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
  Settings,
  X,
  ChevronLeft,
  ChevronRight,
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
  href: string
  icon: LucideIcon
  adminOnly?: boolean
  subItems?: {
    title: string
    href: string
  }[]
}

const menuItems: MenuItem[] = [
  {
    title: "ダッシュボード",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "ユーザー管理",
    href: "/users",
    icon: Users,
    adminOnly: true,
  },
  {
    title: "案件管理",
    href: "/projects",
    icon: Briefcase,
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
    title: "顧客管理",
    href: "/customers",
    icon: Building2,
  },
  {
    title: "見積管理",
    href: "/estimates",
    icon: FileText,
  },
  {
    title: "設定",
    href: "/settings/company",
    icon: Settings,
    adminOnly: true,
  },
]

export function Sidebar({ isOpen = true, onClose, className }: SidebarProps) {
  const pathname = usePathname()
  const { data: session } = useSession()
  const [isCollapsed, setIsCollapsed] = useState(false)
  
  // 管理者権限を持つユーザーか確認
  const isAdmin = session?.user?.isAdmin || false

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
          <h2 className="text-lg font-semibold">メニュー</h2>
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
              .filter((item) => !item.adminOnly || (item.adminOnly && isAdmin))
              .map((item) => {
                const Icon = item.icon
                const isActive = pathname === item.href || 
                  (item.subItems && item.subItems.some(sub => pathname === sub.href))

                return (
                <div key={item.href}>
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
                  
                  {item.subItems && !isCollapsed && (
                    <div className="ml-7 mt-1 space-y-1">
                      {item.subItems.map((subItem) => (
                        <Link
                          key={subItem.href}
                          href={subItem.href}
                          className={cn(
                            "block rounded-lg px-3 py-1.5 text-sm transition-colors hover:bg-accent hover:text-accent-foreground",
                            pathname === subItem.href && "bg-accent text-accent-foreground"
                          )}
                        >
                          {subItem.title}
                        </Link>
                      ))}
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