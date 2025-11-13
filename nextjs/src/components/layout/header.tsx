"use client"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { LogOut, Settings, User, Menu } from "lucide-react"
import { cn } from "@/lib/utils"
import { useSession, signOut } from "next-auth/react"
import Link from "next/link"

interface HeaderProps {
  onMenuClick?: () => void
  className?: string
}

export function Header({ onMenuClick, className }: HeaderProps) {
  const { data: session } = useSession()

  const handleSignOut = () => {
    signOut({ callbackUrl: "/login" })
  }

  const getInitials = (name: string | null | undefined) => {
    if (!name) return "U"
    const names = name.split(" ")
    return names.length >= 2 
      ? `${names[0][0]}${names[1][0]}` 
      : names[0][0]
  }

  return (
    <header className={cn("border-b bg-background", className)}>
      <div className="flex h-16 items-center px-4 gap-4">
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={onMenuClick}
        >
          <Menu className="h-5 w-5" />
        </Button>
        
        <div className="flex-1">
          <h1 className="text-xl font-semibold">Set Plan</h1>
        </div>

        <div className="flex items-center gap-4">

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                <Avatar className="h-10 w-10">
                  <AvatarImage src="" alt="ユーザー" />
                  <AvatarFallback>{getInitials(session?.user?.name)}</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{session?.user?.name || "ユーザー"}</p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {session?.user?.email || ""}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href={`/users/${session?.user?.id}/edit`}>
                  <User className="mr-2 h-4 w-4" />
                  <span>プロフィール</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Settings className="mr-2 h-4 w-4" />
                <span>設定</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-red-600" onClick={handleSignOut}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>ログアウト</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}