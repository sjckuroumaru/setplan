import { PrismaClient } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'

const prisma = new PrismaClient()

// 日付文字列をISO-8601形式に変換する関数
function convertDateString(dateStr: string | null | undefined): Date | null {
  if (!dateStr) return null

  // "YYYY-MM-DD HH:mm:ss.SSS" -> "YYYY-MM-DDTHH:mm:ss.SSSZ"
  const isoString = dateStr.replace(' ', 'T') + 'Z'
  return new Date(isoString)
}

// オブジェクト内の日付文字列を再帰的に変換
function convertDates(obj: any, dateFields: string[]): any {
  if (Array.isArray(obj)) {
    return obj.map(item => convertDates(item, dateFields))
  }

  if (obj && typeof obj === 'object') {
    const converted: any = {}
    for (const [key, value] of Object.entries(obj)) {
      if (dateFields.includes(key) && typeof value === 'string') {
        converted[key] = convertDateString(value)
      } else {
        converted[key] = value
      }
    }
    return converted
  }

  return obj
}

async function main() {
  console.log('データインポートを開始します...')

  const dataDir = path.join(process.cwd(), '..', 'data', '20251008')

  try {
    // 既存データの削除（依存関係の逆順）
    console.log('\n既存データを削除中...')
    await prisma.comment.deleteMany()
    await prisma.issue.deleteMany()
    await prisma.scheduleActual.deleteMany()
    await prisma.schedulePlan.deleteMany()
    await prisma.dailySchedule.deleteMany()
    await prisma.invoiceItem.deleteMany()
    await prisma.invoice.deleteMany()
    await prisma.estimateItem.deleteMany()
    await prisma.estimate.deleteMany()
    await prisma.purchaseOrderItem.deleteMany()
    await prisma.project.deleteMany()
    await prisma.purchaseOrder.deleteMany()
    await prisma.user.deleteMany()
    await prisma.customer.deleteMany()
    await prisma.company.deleteMany()
    console.log('既存データの削除が完了しました')

    // 1. Companies
    console.log('\n会社情報をインポート中...')
    const companiesData = JSON.parse(
      fs.readFileSync(path.join(dataDir, 'companies.json'), 'utf-8')
    )
    const dateFields = ['createdAt', 'updatedAt']
    for (const company of companiesData) {
      const converted = convertDates(company, dateFields)
      await prisma.company.create({ data: converted })
    }
    console.log(`会社情報: ${companiesData.length}件`)

    // 2. Customers
    console.log('\n顧客情報をインポート中...')
    const customersData = JSON.parse(
      fs.readFileSync(path.join(dataDir, 'customers.json'), 'utf-8')
    )
    for (const customer of customersData) {
      const converted = convertDates(customer, dateFields)
      await prisma.customer.create({ data: converted })
    }
    console.log(`顧客情報: ${customersData.length}件`)

    // 3. Users
    console.log('\nユーザー情報をインポート中...')
    const usersData = JSON.parse(
      fs.readFileSync(path.join(dataDir, 'users.json'), 'utf-8')
    )
    for (const user of usersData) {
      const converted = convertDates(user, dateFields)
      await prisma.user.create({ data: converted })
    }
    console.log(`ユーザー情報: ${usersData.length}件`)

    // 4. Purchase Orders
    console.log('\n発注書をインポート中...')
    const purchaseOrdersData = JSON.parse(
      fs.readFileSync(path.join(dataDir, 'purchase_orders.json'), 'utf-8')
    )
    const poDateFields = [...dateFields, 'issueDate', 'deliveryDate']
    for (const purchaseOrder of purchaseOrdersData) {
      const converted = convertDates(purchaseOrder, poDateFields)
      await prisma.purchaseOrder.create({ data: converted })
    }
    console.log(`発注書: ${purchaseOrdersData.length}件`)

    // 5. Purchase Order Items
    console.log('\n発注明細をインポート中...')
    const purchaseOrderItemsData = JSON.parse(
      fs.readFileSync(path.join(dataDir, 'purchase_order_items.json'), 'utf-8')
    )
    for (const item of purchaseOrderItemsData) {
      const converted = convertDates(item, dateFields)
      await prisma.purchaseOrderItem.create({ data: converted })
    }
    console.log(`発注明細: ${purchaseOrderItemsData.length}件`)

    // 6. Projects
    console.log('\nプロジェクト情報をインポート中...')
    const projectsData = JSON.parse(
      fs.readFileSync(path.join(dataDir, 'projects.json'), 'utf-8')
    )
    const projectDateFields = [...dateFields, 'plannedStartDate', 'plannedEndDate', 'actualStartDate', 'actualEndDate']
    for (const project of projectsData) {
      const converted = convertDates(project, projectDateFields)
      await prisma.project.create({ data: converted })
    }
    console.log(`プロジェクト情報: ${projectsData.length}件`)

    // 7. Daily Schedules
    console.log('\n日別スケジュールをインポート中...')
    const dailySchedulesData = JSON.parse(
      fs.readFileSync(path.join(dataDir, 'daily_schedules.json'), 'utf-8')
    )
    const scheduleDateFields = [...dateFields, 'scheduleDate']
    for (const schedule of dailySchedulesData) {
      const converted = convertDates(schedule, scheduleDateFields)
      await prisma.dailySchedule.create({ data: converted })
    }
    console.log(`日別スケジュール: ${dailySchedulesData.length}件`)

    // 8. Schedule Plans
    console.log('\n予定情報をインポート中...')
    const schedulePlansData = JSON.parse(
      fs.readFileSync(path.join(dataDir, 'schedule_plans.json'), 'utf-8')
    )
    for (const plan of schedulePlansData) {
      const converted = convertDates(plan, dateFields)
      await prisma.schedulePlan.create({ data: converted })
    }
    console.log(`予定情報: ${schedulePlansData.length}件`)

    // 9. Schedule Actuals
    console.log('\n実績情報をインポート中...')
    const scheduleActualsData = JSON.parse(
      fs.readFileSync(path.join(dataDir, 'schedule_actuals.json'), 'utf-8')
    )
    for (const actual of scheduleActualsData) {
      const converted = convertDates(actual, dateFields)
      await prisma.scheduleActual.create({ data: converted })
    }
    console.log(`実績情報: ${scheduleActualsData.length}件`)

    // 10. Issues
    console.log('\n課題情報をインポート中...')
    const issuesData = JSON.parse(
      fs.readFileSync(path.join(dataDir, 'issues.json'), 'utf-8')
    )
    const issueDateFields = [...dateFields, 'dueDate', 'resolvedAt', 'startDate', 'endDate']
    for (const issue of issuesData) {
      const converted = convertDates(issue, issueDateFields)
      await prisma.issue.create({ data: converted })
    }
    console.log(`課題情報: ${issuesData.length}件`)

    // 11. Comments
    console.log('\nコメントをインポート中...')
    const commentsData = JSON.parse(
      fs.readFileSync(path.join(dataDir, 'comments.json'), 'utf-8')
    )
    for (const comment of commentsData) {
      const converted = convertDates(comment, dateFields)
      await prisma.comment.create({ data: converted })
    }
    console.log(`コメント: ${commentsData.length}件`)

    // 12. Estimates
    console.log('\n見積書をインポート中...')
    const estimatesData = JSON.parse(
      fs.readFileSync(path.join(dataDir, 'estimates.json'), 'utf-8')
    )
    const estimateDateFields = [...dateFields, 'issueDate', 'validUntil']
    for (const estimate of estimatesData) {
      const converted = convertDates(estimate, estimateDateFields)
      await prisma.estimate.create({ data: converted })
    }
    console.log(`見積書: ${estimatesData.length}件`)

    // 13. Estimate Items
    console.log('\n見積明細をインポート中...')
    const estimateItemsData = JSON.parse(
      fs.readFileSync(path.join(dataDir, 'estimate_items.json'), 'utf-8')
    )
    for (const item of estimateItemsData) {
      const converted = convertDates(item, dateFields)
      await prisma.estimateItem.create({ data: converted })
    }
    console.log(`見積明細: ${estimateItemsData.length}件`)

    // 14. Invoices
    console.log('\n請求書をインポート中...')
    const invoicesData = JSON.parse(
      fs.readFileSync(path.join(dataDir, 'invoices.json'), 'utf-8')
    )
    const invoiceDateFields = [...dateFields, 'issueDate', 'dueDate', 'paidDate']
    for (const invoice of invoicesData) {
      const converted = convertDates(invoice, invoiceDateFields)
      await prisma.invoice.create({ data: converted })
    }
    console.log(`請求書: ${invoicesData.length}件`)

    // 15. Invoice Items
    console.log('\n請求明細をインポート中...')
    const invoiceItemsData = JSON.parse(
      fs.readFileSync(path.join(dataDir, 'invoice_items.json'), 'utf-8')
    )
    for (const item of invoiceItemsData) {
      const converted = convertDates(item, dateFields)
      await prisma.invoiceItem.create({ data: converted })
    }
    console.log(`請求明細: ${invoiceItemsData.length}件`)

    console.log('\n✅ すべてのデータのインポートが完了しました！')
  } catch (error) {
    console.error('❌ エラーが発生しました:', error)
    throw error
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
