import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  // テスト用管理者ユーザーの作成
  const adminPassword = await bcrypt.hash('password', 10)
  const admin = await prisma.user.upsert({
    where: { email: 'admin@setplan.co.jp' },
    update: {},
    create: {
      employeeNumber: '00001',
      username: 'admin',
      email: 'admin@setplan.co.jp',
      password: adminPassword,
      lastName: '管理',
      firstName: '太郎',
      department: 'システム部',
      isAdmin: true,
      status: 'active'
    }
  })

  console.log('Seed data created:', { admin, })
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })