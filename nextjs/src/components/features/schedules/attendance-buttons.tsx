"use client"

import { useState } from "react"
import { useSession } from "next-auth/react"
import useSWR from "swr"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { LogIn, LogOut, Clock } from "lucide-react"
import { getTodayDateString, getCurrentTimeRounded, getCurrentTimeRoundedDown } from "@/lib/attendance-utils"

interface Schedule {
  id: string
  userId: string
  scheduleDate: string
  checkInTime: string | null
  checkOutTime: string | null
  breakTime: number | null
  workLocation: string | null
  reflection?: string | null
  plans: any[]
  actuals: any[]
}

interface AttendanceButtonsProps {
  onAttendanceChange?: () => void
}

export function AttendanceButtons({ onAttendanceChange }: AttendanceButtonsProps) {
  const { data: session } = useSession()
  const [isCheckingIn, setIsCheckingIn] = useState(false)
  const [isCheckingOut, setIsCheckingOut] = useState(false)

  const todayDate = getTodayDateString()

  // 当日の予定実績を取得
  const { data, mutate } = useSWR<{ schedule: Schedule | null }>(
    session?.user?.id ? `/api/schedules/date/${todayDate}?userId=${session.user.id}` : null,
    {
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
    }
  )

  const todaySchedule = data?.schedule

  // 出勤ボタンが活性化されるか（予定実績が未登録の場合）
  const canCheckIn = !todaySchedule

  // 退勤ボタンが活性化されるか（予定実績が登録済み、かつcheckOutTimeが未登録）
  const canCheckOut = todaySchedule && !todaySchedule.checkOutTime

  // 出勤処理
  const handleCheckIn = async () => {
    if (!session?.user?.id) {
      toast.error("ユーザー情報を取得できません")
      return
    }

    try {
      setIsCheckingIn(true)

      const currentTime = getCurrentTimeRounded()

      const response = await fetch("/api/schedules", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          scheduleDate: todayDate,
          checkInTime: currentTime,
          breakTime: 1.0,
          plans: [],
          actuals: [],
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "出勤登録に失敗しました")
      }

      toast.success(`出勤しました (${currentTime})`)
      mutate()
      onAttendanceChange?.()
    } catch (error) {
      console.warn("Check in error:", error)
      toast.error(error instanceof Error ? error.message : "出勤登録に失敗しました")
    } finally {
      setIsCheckingIn(false)
    }
  }

  // 退勤処理
  const handleCheckOut = async () => {
    if (!todaySchedule) {
      toast.error("本日の予定実績が見つかりません")
      return
    }

    try {
      setIsCheckingOut(true)

      const currentTime = getCurrentTimeRoundedDown()

      // 既存のplansとactualsを保持する
      const response = await fetch(`/api/schedules/${todaySchedule.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          checkInTime: todaySchedule.checkInTime,
          checkOutTime: currentTime,
          breakTime: todaySchedule.breakTime,
          workLocation: todaySchedule.workLocation,
          reflection: todaySchedule.reflection || undefined,
          plans: todaySchedule.plans.map((plan) => ({
            projectId: plan.projectId || undefined,
            content: plan.content,
            details: plan.details || undefined,
          })),
          actuals: todaySchedule.actuals.map((actual) => ({
            projectId: actual.projectId || undefined,
            content: actual.content,
            hours: actual.hours,
            details: actual.details || undefined,
          })),
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "退勤登録に失敗しました")
      }

      toast.success(`退勤しました (${currentTime})`)
      mutate()
      onAttendanceChange?.()
    } catch (error) {
      console.warn("Check out error:", error)
      toast.error(error instanceof Error ? error.message : "退勤登録に失敗しました")
    } finally {
      setIsCheckingOut(false)
    }
  }

  if (!session?.user) {
    return null
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* 出勤ボタン */}
      <Card className={`${canCheckIn ? "bg-green-50 border-green-200" : "bg-gray-50 opacity-60"} transition-all`}>
        <CardContent className="p-6">
          <Button
            size="lg"
            className="w-full h-20 text-lg bg-green-500 hover:bg-green-600 disabled:bg-gray-300 disabled:text-gray-500"
            onClick={handleCheckIn}
            disabled={!canCheckIn || isCheckingIn}
          >
            <LogIn className="mr-2 h-6 w-6" />
            {isCheckingIn ? "登録中..." : "出勤"}
          </Button>
          {todaySchedule?.checkInTime && (
            <div className="mt-3 text-center text-sm text-muted-foreground flex items-center justify-center gap-1">
              <Clock className="h-3 w-3" />
              <span>出勤時刻: {todaySchedule.checkInTime}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 退勤ボタン */}
      <Card className={`${canCheckOut ? "bg-red-50 border-red-200" : "bg-gray-50 opacity-60"} transition-all`}>
        <CardContent className="p-6">
          <Button
            size="lg"
            className="w-full h-20 text-lg bg-red-500 hover:bg-red-600 disabled:bg-gray-300 disabled:text-gray-500"
            onClick={handleCheckOut}
            disabled={!canCheckOut || isCheckingOut}
          >
            <LogOut className="mr-2 h-6 w-6" />
            {isCheckingOut ? "登録中..." : "退勤"}
          </Button>
          {todaySchedule?.checkOutTime && (
            <div className="mt-3 text-center text-sm text-muted-foreground flex items-center justify-center gap-1">
              <Clock className="h-3 w-3" />
              <span>退勤時刻: {todaySchedule.checkOutTime}</span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
