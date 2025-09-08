import { prisma } from "@/lib/prisma"

/**
 * 見積番号を生成する
 * 形式: YYYYMM-0001
 */
export async function generateEstimateNumber(): Promise<string> {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, "0")
  const prefix = `${year}${month}`

  // 今月の最新の見積番号を取得
  const latestEstimate = await prisma.estimate.findFirst({
    where: {
      estimateNumber: {
        startsWith: prefix,
      },
    },
    orderBy: {
      estimateNumber: "desc",
    },
  })

  let nextNumber = 1
  if (latestEstimate) {
    // 既存の番号から連番部分を抽出してインクリメント
    const currentNumber = parseInt(latestEstimate.estimateNumber.split("-")[1])
    nextNumber = currentNumber + 1
  }

  // 4桁の連番にフォーマット
  const numberPart = String(nextNumber).padStart(4, "0")
  
  return `${prefix}-${numberPart}`
}