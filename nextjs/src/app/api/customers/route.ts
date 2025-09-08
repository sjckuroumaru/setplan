import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const CustomerSchema = z.object({
  name: z.string().min(1, "会社名は必須です"),
  postalCode: z.string().optional(),
  address: z.string().optional(),
  building: z.string().optional(),
  representative: z.string().optional(),
  phone: z.string().optional(),
  fax: z.string().optional(),
  remarks: z.string().optional(),
  status: z.enum(["active", "inactive"]).optional(),
})

// GET - 顧客一覧取得
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const search = searchParams.get("search")
    const status = searchParams.get("status")
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "20")
    const skip = (page - 1) * limit

    // 検索条件の構築
    const where: any = {}
    
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { representative: { contains: search, mode: "insensitive" } },
      ]
    }
    
    if (status) {
      where.status = status
    }

    // 顧客データ取得
    const [customers, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.customer.count({ where }),
    ])

    return NextResponse.json({
      customers,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    })
  } catch (error) {
    console.error("Customers fetch error:", error)
    return NextResponse.json({ error: "顧客一覧の取得に失敗しました" }, { status: 500 })
  }
}

// POST - 顧客新規作成
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = CustomerSchema.parse(body)

    const customer = await prisma.customer.create({
      data: {
        ...validatedData,
        status: validatedData.status || "active",
      },
    })

    return NextResponse.json({ customer })
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.flatten() }, { status: 400 })
    }
    console.error("Customer create error:", error)
    return NextResponse.json({ error: "顧客の作成に失敗しました" }, { status: 500 })
  }
}