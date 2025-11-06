import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// GET - 実績台帳サマリデータ取得
export async function GET(request: NextRequest) {
  try {
    // 認証チェック
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const projectType = searchParams.get("projectType") || ""
    const statuses = searchParams.getAll("status")
    const departmentId = searchParams.get("departmentId") || ""
    const startDate = searchParams.get("startDate") || ""
    const endDate = searchParams.get("endDate") || ""

    // フィルター条件（実績台帳と同じロジック）
    const where: any = {}

    // ステータスフィルター
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

    // 案件を取得
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
            issueDate: true,
            totalAmount: true,
          },
        },
      },
    })

    // 発行日でのフィルタリング
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

    // データの変換
    const projectData = filteredProjects.map((project) => {
      const orderAmount = project.purchaseOrder?.totalAmount
        ? Number(project.purchaseOrder.totalAmount)
        : project.budget
        ? Number(project.budget)
        : 0

      const outsourcingCost = project.outsourcingCost ? Number(project.outsourcingCost) : 0
      const serverDomainCost = project.serverDomainCost ? Number(project.serverDomainCost) : 0
      const laborCost = project.totalLaborCost ? Number(project.totalLaborCost) : 0
      const grossProfit = orderAmount - outsourcingCost - serverDomainCost - laborCost

      return {
        departmentId: project.departmentId,
        departmentName: project.department?.name || null,
        orderAmount,
        outsourcingCost,
        serverDomainCost,
        laborCost,
        grossProfit,
      }
    })

    // 全体サマリを計算
    const overall = {
      projectCount: projectData.length,
      totalOrderAmount: projectData.reduce((sum, p) => sum + p.orderAmount, 0),
      totalOutsourcingCost: projectData.reduce((sum, p) => sum + p.outsourcingCost, 0),
      totalServerDomainCost: projectData.reduce((sum, p) => sum + p.serverDomainCost, 0),
      totalLaborCost: projectData.reduce((sum, p) => sum + p.laborCost, 0),
      totalGrossProfit: 0,
      averageGrossProfitRate: 0,
    }

    overall.totalGrossProfit =
      overall.totalOrderAmount -
      overall.totalOutsourcingCost -
      overall.totalServerDomainCost -
      overall.totalLaborCost

    overall.averageGrossProfitRate =
      overall.totalOrderAmount > 0
        ? (overall.totalGrossProfit / overall.totalOrderAmount) * 100
        : 0

    // チーム別サマリを計算
    const teamMap = new Map<string, {
      departmentId: string | null
      departmentName: string
      projects: typeof projectData
    }>()

    projectData.forEach((project) => {
      const key = project.departmentId || "unassigned"
      if (!teamMap.has(key)) {
        teamMap.set(key, {
          departmentId: project.departmentId,
          departmentName: project.departmentName || "未割当",
          projects: [],
        })
      }
      teamMap.get(key)!.projects.push(project)
    })

    const byTeam = Array.from(teamMap.values()).map((group) => {
      const orderAmount = group.projects.reduce((sum, p) => sum + p.orderAmount, 0)
      const outsourcingCost = group.projects.reduce((sum, p) => sum + p.outsourcingCost, 0)
      const serverDomainCost = group.projects.reduce((sum, p) => sum + p.serverDomainCost, 0)
      const laborCost = group.projects.reduce((sum, p) => sum + p.laborCost, 0)
      const grossProfit = orderAmount - outsourcingCost - serverDomainCost - laborCost
      const grossProfitRate = orderAmount > 0 ? (grossProfit / orderAmount) * 100 : 0
      const compositionRate = overall.totalOrderAmount > 0 ? (orderAmount / overall.totalOrderAmount) * 100 : 0

      return {
        departmentId: group.departmentId,
        departmentName: group.departmentName,
        projectCount: group.projects.length,
        orderAmount,
        outsourcingCost,
        serverDomainCost,
        laborCost,
        grossProfit,
        grossProfitRate,
        compositionRate,
        averageOrderAmount: group.projects.length > 0 ? orderAmount / group.projects.length : 0,
        averageGrossProfit: group.projects.length > 0 ? grossProfit / group.projects.length : 0,
      }
    })

    // チームを発注金額の降順でソート
    byTeam.sort((a, b) => b.orderAmount - a.orderAmount)

    return NextResponse.json({
      overall,
      byTeam,
    })
  } catch (error) {
    console.error("Performance ledger summary fetch error:", error)
    return NextResponse.json({ error: "サマリの取得に失敗しました" }, { status: 500 })
  }
}
