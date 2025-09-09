/*
  Warnings:

  - You are about to drop the column `invoiceNumberPrefix` on the `companies` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."companies" DROP COLUMN "invoiceNumberPrefix";
