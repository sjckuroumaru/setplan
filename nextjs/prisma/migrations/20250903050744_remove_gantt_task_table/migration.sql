/*
  Warnings:

  - You are about to drop the `gantt_tasks` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."gantt_tasks" DROP CONSTRAINT "gantt_tasks_projectId_fkey";

-- DropTable
DROP TABLE "public"."gantt_tasks";
