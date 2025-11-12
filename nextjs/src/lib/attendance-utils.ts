/**
 * 出勤・退勤機能のユーティリティ関数
 */

/**
 * 指定された時刻を15分単位に丸めます（切り上げ）
 * 例: 13分→15分、01分→15分、16分→30分
 * @param date 丸める時刻（デフォルトは現在時刻）
 * @returns 15分単位に丸められた時刻
 */
export function roundToNearest15Minutes(date: Date = new Date()): Date {
  const rounded = new Date(date)
  const minutes = rounded.getMinutes()
  const roundedMinutes = Math.ceil(minutes / 15) * 15

  rounded.setMinutes(roundedMinutes)
  rounded.setSeconds(0)
  rounded.setMilliseconds(0)

  // 60分になった場合は次の時間に繰り上げ
  if (rounded.getMinutes() === 60) {
    rounded.setMinutes(0)
    rounded.setHours(rounded.getHours() + 1)
  }

  return rounded
}

/**
 * 指定された時刻を15分単位に丸めます（切り下げ）
 * 例: 13分→00分、16分→15分、46分→45分、01分→00分
 * @param date 丸める時刻（デフォルトは現在時刻）
 * @returns 15分単位に丸められた時刻
 */
export function roundDownToNearest15Minutes(date: Date = new Date()): Date {
  const rounded = new Date(date)
  const minutes = rounded.getMinutes()
  const roundedMinutes = Math.floor(minutes / 15) * 15

  rounded.setMinutes(roundedMinutes)
  rounded.setSeconds(0)
  rounded.setMilliseconds(0)

  return rounded
}

/**
 * 時刻をHH:mm形式の文字列に変換します
 * @param date 変換する時刻
 * @returns HH:mm形式の文字列
 */
export function formatTimeToHHmm(date: Date): string {
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${hours}:${minutes}`
}

/**
 * 現在時刻を15分単位に丸めて（切り上げ）HH:mm形式で返します
 * 出勤時に使用します
 * @returns HH:mm形式の文字列
 */
export function getCurrentTimeRounded(): string {
  const roundedDate = roundToNearest15Minutes()
  return formatTimeToHHmm(roundedDate)
}

/**
 * 現在時刻を15分単位に丸めて（切り下げ）HH:mm形式で返します
 * 退勤時に使用します
 * @returns HH:mm形式の文字列
 */
export function getCurrentTimeRoundedDown(): string {
  const roundedDate = roundDownToNearest15Minutes()
  return formatTimeToHHmm(roundedDate)
}

/**
 * 今日の日付をYYYY-MM-DD形式で返します
 * @returns YYYY-MM-DD形式の文字列
 */
export function getTodayDateString(): string {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const day = String(today.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}
