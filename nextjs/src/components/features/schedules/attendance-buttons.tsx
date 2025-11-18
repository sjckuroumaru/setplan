"use client"

import { useState } from "react"
import { useSession } from "next-auth/react"
import useSWR from "swr"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { LogIn, LogOut, Clock } from "lucide-react"
import { getTodayDateString, getCurrentTimeRounded, getCurrentTimeRoundedDown } from "@/lib/attendance-utils"

/**
 * エラーオブジェクトを分かりやすいメッセージに変換します
 * @param error エラーオブジェクト
 * @returns エラーメッセージ文字列
 */
function formatErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }
  if (typeof error === 'string') {
    return error
  }
  if (typeof error === 'object' && error !== null) {
    // オブジェクトの場合、可能な限り詳細を抽出
    if ('message' in error && typeof error.message === 'string') {
      return error.message
    }
    // 配列の場合（バリデーションエラーなど）
    if (Array.isArray(error)) {
      return error.map((e: any) => e.message || JSON.stringify(e)).join(', ')
    }
    // それ以外の場合はJSON文字列化して詳細を表示
    try {
      const errorStr = JSON.stringify(error, null, 2)
      return `エラー詳細: ${errorStr}`
    } catch {
      return String(error)
    }
  }
  return 'エラーが発生しました'
}

const workLocationLabels = {
  office: "出社",
  remote: "在宅",
  client_site: "客先常駐",
  business_trip: "外出",
  paid_leave: "有給休暇",
}

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
  const [showCheckInDialog, setShowCheckInDialog] = useState(false)
  const [selectedWorkLocation, setSelectedWorkLocation] = useState<string>("office")

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

  // 出勤ボタンクリック時：ダイアログを表示
  const handleCheckInClick = () => {
    setShowCheckInDialog(true)
  }

  // 出勤処理（ダイアログのOKボタンクリック時）
  const handleCheckIn = async () => {
    if (!session?.user?.id) {
      toast.error("ユーザー情報を取得できません")
      return
    }

    if (!selectedWorkLocation) {
      toast.error("勤務場所を選択してください")
      return
    }

    try {
      setIsCheckingIn(true)
      setShowCheckInDialog(false)

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
          workLocation: selectedWorkLocation,
          plans: [],
          actuals: [],
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        // data.errorが配列の場合の処理
        const errorMessage = Array.isArray(data.error)
          ? data.error.map((e: any) => e.message || JSON.stringify(e)).join(', ')
          : (data.error || "出勤登録に失敗しました")
        throw new Error(errorMessage)
      }

      toast.success(`出勤しました (${currentTime})`)
      mutate()
      onAttendanceChange?.()
    } catch (error) {
      console.error("Check in error:", error)
      const errorMessage = formatErrorMessage(error)
      toast.error(`出勤登録に失敗しました: ${errorMessage}`)
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
      console.error("Check out error:", error)
      const errorMessage = formatErrorMessage(error)
      toast.error(`退勤登録に失敗しました: ${errorMessage}`)
    } finally {
      setIsCheckingOut(false)
    }
  }

  if (!session?.user) {
    return null
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 出勤ボタン */}
        <Card className={`${canCheckIn ? "bg-green-50 border-green-200" : "bg-gray-50 opacity-60"} transition-all`}>
          <CardContent className="p-6">
            <Button
              size="lg"
              className="w-full h-20 text-lg bg-green-500 hover:bg-green-600 disabled:bg-gray-300 disabled:text-gray-500"
              onClick={handleCheckInClick}
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

      {/* 出勤時の勤務場所選択ダイアログ */}
      <Dialog open={showCheckInDialog} onOpenChange={setShowCheckInDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>出勤登録</DialogTitle>
            <DialogDescription>
              本日の勤務場所を選択してください
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="work-location">勤務場所</Label>
              <Select value={selectedWorkLocation} onValueChange={setSelectedWorkLocation}>
                <SelectTrigger id="work-location">
                  <SelectValue placeholder="勤務場所を選択" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="office">{workLocationLabels.office}</SelectItem>
                  <SelectItem value="remote">{workLocationLabels.remote}</SelectItem>
                  <SelectItem value="client_site">{workLocationLabels.client_site}</SelectItem>
                  <SelectItem value="business_trip">{workLocationLabels.business_trip}</SelectItem>
                  <SelectItem value="paid_leave">{workLocationLabels.paid_leave}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCheckInDialog(false)}
              disabled={isCheckingIn}
            >
              キャンセル
            </Button>
            <Button
              onClick={handleCheckIn}
              disabled={isCheckingIn}
            >
              {isCheckingIn ? "登録中..." : "OK"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
