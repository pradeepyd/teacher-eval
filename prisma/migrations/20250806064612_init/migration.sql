-- CreateEnum
CREATE TYPE "public"."Role" AS ENUM ('TEACHER', 'HOD', 'ASST_DEAN', 'DEAN', 'ADMIN');

-- CreateEnum
CREATE TYPE "public"."Term" AS ENUM ('START', 'END');

-- CreateEnum
CREATE TYPE "public"."QuestionType" AS ENUM ('TEXT', 'TEXTAREA', 'MCQ', 'CHECKBOX');

-- CreateEnum
CREATE TYPE "public"."ReviewStatus" AS ENUM ('PROMOTED', 'ON_HOLD', 'NEEDS_IMPROVEMENT');

-- CreateTable
CREATE TABLE "public"."users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "public"."Role" NOT NULL,
    "departmentId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."departments" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "departments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."term_state" (
    "id" TEXT NOT NULL,
    "departmentId" TEXT NOT NULL,
    "activeTerm" "public"."Term" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "term_state_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."questions" (
    "id" TEXT NOT NULL,
    "departmentId" TEXT NOT NULL,
    "term" "public"."Term" NOT NULL,
    "type" "public"."QuestionType" NOT NULL,
    "question" TEXT NOT NULL,
    "options" TEXT[],
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."teacher_answers" (
    "id" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "term" "public"."Term" NOT NULL,
    "answer" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "teacher_answers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."self_comments" (
    "id" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "term" "public"."Term" NOT NULL,
    "comment" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "self_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."hod_reviews" (
    "id" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "term" "public"."Term" NOT NULL,
    "reviewerId" TEXT NOT NULL,
    "comments" TEXT NOT NULL,
    "scores" JSONB NOT NULL,
    "submitted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hod_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."asst_reviews" (
    "id" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "term" "public"."Term" NOT NULL,
    "reviewerId" TEXT NOT NULL,
    "comments" TEXT NOT NULL,
    "scores" JSONB NOT NULL,
    "submitted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "asst_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."final_reviews" (
    "id" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "term" "public"."Term" NOT NULL,
    "reviewerId" TEXT NOT NULL,
    "finalComment" TEXT NOT NULL,
    "finalScore" INTEGER NOT NULL,
    "status" "public"."ReviewStatus" NOT NULL,
    "submitted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "final_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "public"."users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "departments_name_key" ON "public"."departments"("name");

-- CreateIndex
CREATE UNIQUE INDEX "term_state_departmentId_key" ON "public"."term_state"("departmentId");

-- CreateIndex
CREATE UNIQUE INDEX "teacher_answers_teacherId_questionId_term_key" ON "public"."teacher_answers"("teacherId", "questionId", "term");

-- CreateIndex
CREATE UNIQUE INDEX "self_comments_teacherId_term_key" ON "public"."self_comments"("teacherId", "term");

-- CreateIndex
CREATE UNIQUE INDEX "hod_reviews_teacherId_term_key" ON "public"."hod_reviews"("teacherId", "term");

-- CreateIndex
CREATE UNIQUE INDEX "asst_reviews_teacherId_term_key" ON "public"."asst_reviews"("teacherId", "term");

-- CreateIndex
CREATE UNIQUE INDEX "final_reviews_teacherId_term_key" ON "public"."final_reviews"("teacherId", "term");

-- AddForeignKey
ALTER TABLE "public"."users" ADD CONSTRAINT "users_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "public"."departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."term_state" ADD CONSTRAINT "term_state_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "public"."departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."questions" ADD CONSTRAINT "questions_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "public"."departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."teacher_answers" ADD CONSTRAINT "teacher_answers_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."teacher_answers" ADD CONSTRAINT "teacher_answers_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "public"."questions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."self_comments" ADD CONSTRAINT "self_comments_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."hod_reviews" ADD CONSTRAINT "hod_reviews_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."hod_reviews" ADD CONSTRAINT "hod_reviews_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."asst_reviews" ADD CONSTRAINT "asst_reviews_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."asst_reviews" ADD CONSTRAINT "asst_reviews_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."final_reviews" ADD CONSTRAINT "final_reviews_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."final_reviews" ADD CONSTRAINT "final_reviews_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
