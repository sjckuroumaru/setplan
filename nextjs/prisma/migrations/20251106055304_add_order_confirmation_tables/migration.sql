-- CreateTable
CREATE TABLE "order_confirmations" (
    "id" TEXT NOT NULL,
    "confirmationNumber" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "honorific" TEXT NOT NULL DEFAULT '御中',
    "subject" TEXT NOT NULL,
    "issueDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deliveryDate" TIMESTAMP(3),
    "completionPeriod" TEXT,
    "paymentTerms" TEXT,
    "userId" TEXT NOT NULL,
    "taxType" TEXT NOT NULL DEFAULT 'exclusive',
    "taxRate" INTEGER NOT NULL DEFAULT 10,
    "roundingType" TEXT NOT NULL DEFAULT 'floor',
    "subtotal" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "taxAmount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "taxAmount8" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "taxAmount10" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "totalAmount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "remarks" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "purchaseOrderId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "order_confirmations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_confirmation_items" (
    "id" TEXT NOT NULL,
    "orderConfirmationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "quantity" DECIMAL(10,2) NOT NULL DEFAULT 1,
    "unit" TEXT,
    "unitPrice" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "taxType" TEXT NOT NULL DEFAULT 'taxable',
    "taxRate" INTEGER NOT NULL DEFAULT 10,
    "amount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "remarks" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "order_confirmation_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "order_confirmations_confirmationNumber_key" ON "order_confirmations"("confirmationNumber");

-- AddForeignKey
ALTER TABLE "order_confirmations" ADD CONSTRAINT "order_confirmations_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_confirmations" ADD CONSTRAINT "order_confirmations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_confirmations" ADD CONSTRAINT "order_confirmations_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "purchase_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_confirmation_items" ADD CONSTRAINT "order_confirmation_items_orderConfirmationId_fkey" FOREIGN KEY ("orderConfirmationId") REFERENCES "order_confirmations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
