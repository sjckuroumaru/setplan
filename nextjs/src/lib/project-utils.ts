import { PrismaClient, Prisma } from "@prisma/client"

/**
 * 案件の投下工数（総作業時間と総投下工数）を再計算して更新する
 *
 * @param projectId - 案件ID
 * @param tx - トランザクション用のPrismaクライアント（オプション）
 */
export async function recalculateProjectLaborCost(
  projectId: string,
  tx?: Omit<PrismaClient, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">
) {
  // トランザクション内かどうかで使用するクライアントを切り替え
  const prisma = tx || (await import("@/lib/prisma")).prisma

  // 案件に紐づく全実績時間の合計を取得
  const totalHours = await prisma.scheduleActual.aggregate({
    where: { projectId },
    _sum: { hours: true }
  })

  // 案件情報を取得
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { hourlyRate: true }
  })

  if (!project) {
    throw new Error(`Project with id ${projectId} not found`)
  }

  // 投下工数を計算
  // 時間単価がNULLの場合は5,000円/時間をデフォルト値として使用
  const hours = totalHours._sum.hours || 0
  const hourlyRate = project.hourlyRate || 5000
  const laborCost = Number(hours) * Number(hourlyRate)

  // Projectテーブルを更新
  await prisma.project.update({
    where: { id: projectId },
    data: {
      totalLaborHours: hours,
      totalLaborCost: laborCost,
      lastCalculatedAt: new Date()
    }
  })
}

/**
 * トランザクション内で案件の投下工数を再計算
 *
 * 実績の作成・更新・削除時にこの関数を使用してトランザクション処理を行う
 *
 * @param callback - トランザクション内で実行する処理
 */
export async function recalculateWithTransaction<T>(
  callback: (tx: Prisma.TransactionClient) => Promise<{
    result: T
    projectIds: string[]
  }>
) {
  const { prisma } = await import("@/lib/prisma")

  return await prisma.$transaction(async (tx) => {
    const { result, projectIds } = await callback(tx)

    // 影響を受けた案件の集計値を再計算
    for (const projectId of projectIds) {
      await recalculateProjectLaborCost(projectId, tx)
    }

    return result
  })
}
