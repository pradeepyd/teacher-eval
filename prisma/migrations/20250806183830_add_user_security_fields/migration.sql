-- DropForeignKey
ALTER TABLE "public"."users" DROP CONSTRAINT "users_departmentId_fkey";

-- AlterTable
ALTER TABLE "public"."users" ADD COLUMN     "emailVerified" TIMESTAMP(3),
ADD COLUMN     "failedLogins" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "lastLogin" TIMESTAMP(3),
ADD COLUMN     "lockedUntil" TIMESTAMP(3),
ALTER COLUMN "departmentId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "public"."users" ADD CONSTRAINT "users_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "public"."departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
