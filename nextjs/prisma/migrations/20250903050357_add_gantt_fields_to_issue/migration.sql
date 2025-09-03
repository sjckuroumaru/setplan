-- AlterTable
ALTER TABLE "public"."issues" ADD COLUMN     "dependencies" TEXT,
ADD COLUMN     "endDate" TIMESTAMP(3),
ADD COLUMN     "parentIssueId" TEXT,
ADD COLUMN     "progress" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "startDate" TIMESTAMP(3);

-- AddForeignKey
ALTER TABLE "public"."issues" ADD CONSTRAINT "issues_parentIssueId_fkey" FOREIGN KEY ("parentIssueId") REFERENCES "public"."issues"("id") ON DELETE SET NULL ON UPDATE CASCADE;
