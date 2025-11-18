-- CreateTable
CREATE TABLE "public"."estimate_attachments" (
    "id" TEXT NOT NULL,
    "estimateId" TEXT NOT NULL,
    "fileName" VARCHAR(255) NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "mimeType" VARCHAR(100) NOT NULL,
    "blobPath" VARCHAR(500) NOT NULL,
    "blobUrl" TEXT NOT NULL,
    "uploadedBy" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "estimate_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "estimate_attachments_estimateId_createdAt_idx" ON "public"."estimate_attachments"("estimateId", "createdAt");

-- AddForeignKey
ALTER TABLE "public"."estimate_attachments" ADD CONSTRAINT "estimate_attachments_estimateId_fkey" FOREIGN KEY ("estimateId") REFERENCES "public"."estimates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."estimate_attachments" ADD CONSTRAINT "estimate_attachments_uploadedBy_fkey" FOREIGN KEY ("uploadedBy") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
