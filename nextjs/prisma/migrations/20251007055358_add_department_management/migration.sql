-- AlterTable
ALTER TABLE "public"."projects" ADD COLUMN     "departmentId" TEXT,
ADD COLUMN     "purchaseOrderId" TEXT;

-- AlterTable
ALTER TABLE "public"."users" ADD COLUMN     "departmentId" TEXT;

-- CreateTable
CREATE TABLE "public"."departments" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "departments_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."users" ADD CONSTRAINT "users_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "public"."departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."projects" ADD CONSTRAINT "projects_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "public"."departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."projects" ADD CONSTRAINT "projects_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "public"."purchase_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
