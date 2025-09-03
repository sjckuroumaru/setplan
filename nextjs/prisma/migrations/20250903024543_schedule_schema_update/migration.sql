/*
  Warnings:

  - You are about to drop the `schedules` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."schedules" DROP CONSTRAINT "schedules_projectId_fkey";

-- DropForeignKey
ALTER TABLE "public"."schedules" DROP CONSTRAINT "schedules_userId_fkey";

-- DropTable
DROP TABLE "public"."schedules";

-- CreateTable
CREATE TABLE "public"."daily_schedules" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "scheduleDate" DATE NOT NULL,
    "checkInTime" TEXT,
    "checkOutTime" TEXT,
    "reflection" TEXT,
    "status" TEXT NOT NULL DEFAULT 'planned',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "daily_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."schedule_plans" (
    "id" TEXT NOT NULL,
    "scheduleId" TEXT NOT NULL,
    "projectId" TEXT,
    "content" TEXT NOT NULL,
    "details" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "schedule_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."schedule_actuals" (
    "id" TEXT NOT NULL,
    "scheduleId" TEXT NOT NULL,
    "projectId" TEXT,
    "content" TEXT NOT NULL,
    "hours" DOUBLE PRECISION NOT NULL,
    "details" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "schedule_actuals_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "daily_schedules_userId_scheduleDate_key" ON "public"."daily_schedules"("userId", "scheduleDate");

-- AddForeignKey
ALTER TABLE "public"."daily_schedules" ADD CONSTRAINT "daily_schedules_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."schedule_plans" ADD CONSTRAINT "schedule_plans_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "public"."daily_schedules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."schedule_plans" ADD CONSTRAINT "schedule_plans_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "public"."projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."schedule_actuals" ADD CONSTRAINT "schedule_actuals_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "public"."daily_schedules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."schedule_actuals" ADD CONSTRAINT "schedule_actuals_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "public"."projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;
