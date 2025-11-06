import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// GET - 実績台帳データ取得
export async function GET(request: NextRequest) {
  try {
    // 認証チェック
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "50")
    const projectType = searchParams.get("projectType") || ""
    const statuses = searchParams.getAll("status")
    const departmentId = searchParams.get("departmentId") || ""
    const startDate = searchParams.get("startDate") || ""
    const endDate = searchParams.get("endDate") || ""
    const sortBy = searchParams.get("sortBy") || "issueDate"
    const sortOrder = (searchParams.get("sortOrder") || "desc") as "asc" | "desc"

    const skip = (page - 1) * limit

    // フィルター条件
    const where: any = {}

    // ステータスフィルター
    // statusesが指定されている場合：指定されたステータスで絞り込み
    // statusesが空の場合：すべてのステータスを表示
    if (statuses.length > 0) {
      where.status = {
        in: statuses
      }
    }

    if (projectType && projectType !== "all") {
      where.projectType = projectType
    }

    if (departmentId && departmentId !== "all") {
      where.departmentId = departmentId
    }

    // 案件を取得（発注書と関連データを含む）
    const projects = await prisma.project.findMany({
      where,
      include: {
        department: {
          select: {
            id: true,
            name: true,
          },
        },
        purchaseOrder: {
          select: {
            id: true,
            orderNumber: true,
            issueDate: true,
            deliveryDate: true,
            totalAmount: true,
            supplier: {
              select: {
                id: true,
                name: true,
              },
            },
            user: {
              select: {
                id: true,
                lastName: true,
                firstName: true,
              },
            },
          },
        },
      },
      skip,
      take: limit,
    })

    // 発行日でのフィルタリング（データ取得後）
    let filteredProjects = projects
    if (startDate || endDate) {
      filteredProjects = projects.filter((project) => {
        const issueDate = project.purchaseOrder?.issueDate
          ? new Date(project.purchaseOrder.issueDate)
          : new Date(project.createdAt)

        if (startDate) {
          const start = new Date(startDate)
          if (issueDate < start) return false
        }

        if (endDate) {
          const end = new Date(endDate)
          if (issueDate > end) return false
        }

        return true
      })
    }

    // データの変換と計算
    const data = filteredProjects.map((project) => {
      // 発注金額: 発注書金額 → 案件予算 → 0円の優先順
      const orderAmount = project.purchaseOrder?.totalAmount
        ? Number(project.purchaseOrder.totalAmount)
        : project.budget
        ? Number(project.budget)
        : 0

      // 外注費とサーバー費用
      const outsourcingCost = project.outsourcingCost ? Number(project.outsourcingCost) : 0
      const serverDomainCost = project.serverDomainCost ? Number(project.serverDomainCost) : 0

      // 投下工数（事前計算済みの値を使用）
      const laborCost = project.totalLaborCost ? Number(project.totalLaborCost) : 0

      // 粗利 = 発注金額 - 外注費 - サーバー・ドメイン代 - 投下工数
      const grossProfit = orderAmount - outsourcingCost - serverDomainCost - laborCost

      // 粗利率 = (粗利 ÷ 発注金額) × 100
      const grossProfitRate = orderAmount > 0 ? (grossProfit / orderAmount) * 100 : 0

      // 発行日: 発注書の発行日、なければ案件登録日
      const issueDate = project.purchaseOrder?.issueDate
        ? new Date(project.purchaseOrder.issueDate).toISOString()
        : new Date(project.createdAt).toISOString()

      // 記入者: 発注書作成者のフルネーム
      const editorName = project.purchaseOrder?.user
        ? `${project.purchaseOrder.user.lastName} ${project.purchaseOrder.user.firstName}`
        : null

      return {
        projectId: project.id,
        projectNumber: project.projectNumber,
        projectName: project.projectName,
        issueDate,
        supplierName: project.purchaseOrder?.supplier?.name || null,
        projectType: project.projectType || "development",
        editorName,
        teamName: project.department?.name || null,
        status: project.status,
        memo: project.memo,
        orderAmount,
        deliveryDeadline: project.purchaseOrder?.deliveryDate
          ? new Date(project.purchaseOrder.deliveryDate).toISOString()
          : null,
        deliveryDate: project.deliveryDate
          ? new Date(project.deliveryDate).toISOString()
          : null,
        invoiceableDate: project.invoiceableDate
          ? new Date(project.invoiceableDate).toISOString()
          : null,
        outsourcingCost,
        serverDomainCost,
        laborCost,
        grossProfit,
        grossProfitRate,
      }
    })

    // ソート処理
    data.sort((a, b) => {
      let aValue: any
      let bValue: any

      switch (sortBy) {
        case "issueDate":
          aValue = new Date(a.issueDate).getTime()
          bValue = new Date(b.issueDate).getTime()
          break
        case "orderAmount":
          aValue = a.orderAmount
          bValue = b.orderAmount
          break
        case "laborCost":
          aValue = a.laborCost
          bValue = b.laborCost
          break
        case "grossProfit":
          aValue = a.grossProfit
          bValue = b.grossProfit
          break
        case "grossProfitRate":
          aValue = a.grossProfitRate
          bValue = b.grossProfitRate
          break
        case "projectNumber":
          aValue = a.projectNumber
          bValue = b.projectNumber
          break
        case "projectName":
          aValue = a.projectName
          bValue = b.projectName
          break
        default:
          aValue = new Date(a.issueDate).getTime()
          bValue = new Date(b.issueDate).getTime()
      }

      if (sortOrder === "asc") {
        return aValue > bValue ? 1 : aValue < bValue ? -1 : 0
      } else {
        return aValue < bValue ? 1 : aValue > bValue ? -1 : 0
      }
    })

    // 総件数を取得
    const total = await prisma.project.count({ where })

    return NextResponse.json({
      data,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalCount: total,
        limit,
      },
    })
  } catch (error) {
    console.warn("Performance ledger fetch error:", error)
    return NextResponse.json({ error: "実績台帳の取得に失敗しました" }, { status: 500 })
  }
}
