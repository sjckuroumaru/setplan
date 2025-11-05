-- AlterTable
ALTER TABLE "public"."projects" ADD COLUMN     "deliveryDate" DATE,
ADD COLUMN     "invoiceableDate" DATE,
ADD COLUMN     "lastCalculatedAt" TIMESTAMP(3),
ADD COLUMN     "memo" TEXT,
ADD COLUMN     "outsourcingCost" DECIMAL(15,2) DEFAULT 0,
ADD COLUMN     "projectType" TEXT DEFAULT 'development',
ADD COLUMN     "serverDomainCost" DECIMAL(15,2) DEFAULT 0,
ADD COLUMN     "totalLaborCost" DECIMAL(15,2) DEFAULT 0,
ADD COLUMN     "totalLaborHours" DECIMAL(10,2) DEFAULT 0;
