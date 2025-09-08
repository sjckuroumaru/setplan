-- CreateTable
CREATE TABLE "public"."estimates" (
    "id" TEXT NOT NULL,
    "estimateNumber" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "honorific" TEXT NOT NULL DEFAULT '御中',
    "subject" TEXT NOT NULL,
    "issueDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validUntil" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,
    "taxType" TEXT NOT NULL DEFAULT 'exclusive',
    "taxRate" INTEGER NOT NULL DEFAULT 10,
    "roundingType" TEXT NOT NULL DEFAULT 'floor',
    "subtotal" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "taxAmount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "totalAmount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "remarks" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "estimates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."estimate_items" (
    "id" TEXT NOT NULL,
    "estimateId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "quantity" DECIMAL(10,2) NOT NULL DEFAULT 1,
    "unit" TEXT,
    "unitPrice" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "taxType" TEXT NOT NULL DEFAULT 'taxable',
    "amount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "remarks" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "estimate_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "estimates_estimateNumber_key" ON "public"."estimates"("estimateNumber");

-- AddForeignKey
ALTER TABLE "public"."estimates" ADD CONSTRAINT "estimates_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "public"."customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."estimates" ADD CONSTRAINT "estimates_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."estimate_items" ADD CONSTRAINT "estimate_items_estimateId_fkey" FOREIGN KEY ("estimateId") REFERENCES "public"."estimates"("id") ON DELETE CASCADE ON UPDATE CASCADE;
