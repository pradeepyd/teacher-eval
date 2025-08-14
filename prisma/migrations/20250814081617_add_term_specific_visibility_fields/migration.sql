-- AlterTable
ALTER TABLE "public"."asst_reviews" ADD COLUMN     "termId" TEXT;

-- AlterTable
ALTER TABLE "public"."final_reviews" ADD COLUMN     "termId" TEXT;

-- AlterTable
ALTER TABLE "public"."hod_reviews" ADD COLUMN     "termId" TEXT;

-- AlterTable
ALTER TABLE "public"."questions" ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "optionScores" INTEGER[] DEFAULT ARRAY[]::INTEGER[];

-- AlterTable
ALTER TABLE "public"."self_comments" ADD COLUMN     "submitted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "termId" TEXT;

-- AlterTable
ALTER TABLE "public"."teacher_answers" ADD COLUMN     "termId" TEXT;

-- AlterTable
ALTER TABLE "public"."term_state" ADD COLUMN     "endTermVisibility" TEXT NOT NULL DEFAULT 'DRAFT',
ADD COLUMN     "hodVisibility" TEXT NOT NULL DEFAULT 'DRAFT',
ADD COLUMN     "startTermVisibility" TEXT NOT NULL DEFAULT 'DRAFT',
ADD COLUMN     "visibility" TEXT NOT NULL DEFAULT 'DRAFT';

-- CreateTable
CREATE TABLE "public"."hod_performance_reviews" (
    "id" TEXT NOT NULL,
    "hodId" TEXT NOT NULL,
    "term" "public"."TermType" NOT NULL,
    "reviewerId" TEXT NOT NULL,
    "comments" TEXT NOT NULL,
    "scores" JSONB NOT NULL,
    "totalScore" INTEGER,
    "submitted" BOOLEAN NOT NULL DEFAULT false,
    "termId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hod_performance_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "hod_performance_reviews_hodId_term_reviewerId_key" ON "public"."hod_performance_reviews"("hodId", "term", "reviewerId");

-- AddForeignKey
ALTER TABLE "public"."teacher_answers" ADD CONSTRAINT "teacher_answers_termId_fkey" FOREIGN KEY ("termId") REFERENCES "public"."terms"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."self_comments" ADD CONSTRAINT "self_comments_termId_fkey" FOREIGN KEY ("termId") REFERENCES "public"."terms"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."hod_reviews" ADD CONSTRAINT "hod_reviews_termId_fkey" FOREIGN KEY ("termId") REFERENCES "public"."terms"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."asst_reviews" ADD CONSTRAINT "asst_reviews_termId_fkey" FOREIGN KEY ("termId") REFERENCES "public"."terms"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."final_reviews" ADD CONSTRAINT "final_reviews_termId_fkey" FOREIGN KEY ("termId") REFERENCES "public"."terms"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."hod_performance_reviews" ADD CONSTRAINT "hod_performance_reviews_hodId_fkey" FOREIGN KEY ("hodId") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."hod_performance_reviews" ADD CONSTRAINT "hod_performance_reviews_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."hod_performance_reviews" ADD CONSTRAINT "hod_performance_reviews_termId_fkey" FOREIGN KEY ("termId") REFERENCES "public"."terms"("id") ON DELETE SET NULL ON UPDATE CASCADE;
