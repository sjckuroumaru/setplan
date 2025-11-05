/**
 * 既存案件の集計値（totalLaborHours, totalLaborCost）を一括計算するマイグレーションスクリプト
 *
 * 実行方法:
 * cd nextjs
 * npx ts-node scripts/migrate-calculate-labor-costs.ts
 */

import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function recalculateProjectLaborCost(projectId: string) {
  // 案件に紐づく全実績時間の合計を取得
  const totalHours = await prisma.scheduleActual.aggregate({
    where: { projectId },
    _sum: { hours: true }
  })

  // 案件情報を取得
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { hourlyRate: true, projectNumber: true }
  })

  if (!project) {
    console.warn(`⚠️  Project ${projectId} not found`)
    return
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

  console.log(
    `✓ ${project.projectNumber}: ${hours}h × ¥${hourlyRate}/h = ¥${laborCost.toLocaleString()}`
  )
}

async function main() {
  console.log("🚀 実績台帳マイグレーション: 集計値の一括計算を開始します\n")

  try {
    // 全案件を取得
    const projects = await prisma.project.findMany({
      select: { id: true, projectNumber: true }
    })

    console.log(`📊 対象案件数: ${projects.length}件\n`)

    if (projects.length === 0) {
      console.log("✓ 処理する案件がありません")
      return
    }

    let successCount = 0
    let errorCount = 0

    // 各案件の集計値を計算
    for (const project of projects) {
      try {
        await recalculateProjectLaborCost(project.id)
        successCount++
      } catch (error) {
        console.error(`✗ ${project.projectNumber}: エラー - ${error}`)
        errorCount++
      }
    }

    console.log("\n" + "=".repeat(60))
    console.log(`✅ マイグレーション完了`)
    console.log(`   成功: ${successCount}件`)
    if (errorCount > 0) {
      console.log(`   失敗: ${errorCount}件`)
    }
    console.log("=".repeat(60))
  } catch (error) {
    console.error("❌ マイグレーション失敗:", error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

// スクリプト実行
main()
  .catch((error) => {
    console.error("❌ 予期しないエラー:", error)
    process.exit(1)
  })
