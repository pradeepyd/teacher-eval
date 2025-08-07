/*
  Warnings:

  - You are about to drop the column `emailVerified` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `failedLogins` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `lastLogin` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `lockedUntil` on the `users` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "public"."TermType" AS ENUM ('START', 'END');

-- CreateEnum
CREATE TYPE "public"."TermStatus" AS ENUM ('INACTIVE', 'START', 'END');

-- AlterTable
ALTER TABLE "public"."asst_reviews" ALTER COLUMN "term" TYPE "public"."TermType" USING "term"::text::"public"."TermType";

-- AlterTable
ALTER TABLE "public"."final_reviews" ALTER COLUMN "term" TYPE "public"."TermType" USING "term"::text::"public"."TermType";

-- AlterTable
ALTER TABLE "public"."hod_reviews" ALTER COLUMN "term" TYPE "public"."TermType" USING "term"::text::"public"."TermType";

-- AlterTable
ALTER TABLE "public"."questions" ALTER COLUMN "term" TYPE "public"."TermType" USING "term"::text::"public"."TermType";

-- AlterTable
ALTER TABLE "public"."self_comments" ALTER COLUMN "term" TYPE "public"."TermType" USING "term"::text::"public"."TermType";

-- AlterTable
ALTER TABLE "public"."teacher_answers" ALTER COLUMN "term" TYPE "public"."TermType" USING "term"::text::"public"."TermType";

-- AlterTable
ALTER TABLE "public"."term_state" ALTER COLUMN "activeTerm" TYPE "public"."TermType" USING "activeTerm"::text::"public"."TermType";

-- AlterTable
ALTER TABLE "public"."users" DROP COLUMN "emailVerified",
DROP COLUMN "failedLogins",
DROP COLUMN "lastLogin",
DROP COLUMN "lockedUntil";

-- DropEnum
DROP TYPE "public"."Term";

-- CreateTable
CREATE TABLE "public"."terms" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "status" "public"."TermStatus" NOT NULL DEFAULT 'INACTIVE',
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "terms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."_DepartmentTerms" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_DepartmentTerms_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_DepartmentTerms_B_index" ON "public"."_DepartmentTerms"("B");

-- CreateIndex
CREATE UNIQUE INDEX "asst_reviews_teacherId_term_key" ON "public"."asst_reviews"("teacherId", "term");

-- CreateIndex
CREATE UNIQUE INDEX "final_reviews_teacherId_term_key" ON "public"."final_reviews"("teacherId", "term");

-- CreateIndex
CREATE UNIQUE INDEX "hod_reviews_teacherId_term_key" ON "public"."hod_reviews"("teacherId", "term");

-- CreateIndex
CREATE UNIQUE INDEX "self_comments_teacherId_term_key" ON "public"."self_comments"("teacherId", "term");

-- CreateIndex
CREATE UNIQUE INDEX "teacher_answers_teacherId_questionId_term_key" ON "public"."teacher_answers"("teacherId", "questionId", "term");

-- AddForeignKey
ALTER TABLE "public"."_DepartmentTerms" ADD CONSTRAINT "_DepartmentTerms_A_fkey" FOREIGN KEY ("A") REFERENCES "public"."departments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_DepartmentTerms" ADD CONSTRAINT "_DepartmentTerms_B_fkey" FOREIGN KEY ("B") REFERENCES "public"."terms"("id") ON DELETE CASCADE ON UPDATE CASCADE;
