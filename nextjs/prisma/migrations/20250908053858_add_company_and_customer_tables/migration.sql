-- AlterTable
ALTER TABLE "public"."users" ADD COLUMN     "sealImagePath" TEXT;

-- CreateTable
CREATE TABLE "public"."companies" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "postalCode" TEXT,
    "address" TEXT,
    "building" TEXT,
    "representative" TEXT,
    "phone" TEXT,
    "fax" TEXT,
    "remarks" TEXT,
    "sealImagePath" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "companies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."customers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "postalCode" TEXT,
    "address" TEXT,
    "building" TEXT,
    "representative" TEXT,
    "phone" TEXT,
    "fax" TEXT,
    "remarks" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);
