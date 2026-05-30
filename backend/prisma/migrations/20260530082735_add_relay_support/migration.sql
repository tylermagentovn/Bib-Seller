/*
  Warnings:

  - You are about to drop the column `sepayRef` on the `Payment` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "DistanceType" AS ENUM ('SOLO', 'RELAY');

-- DropIndex
DROP INDEX "Payment_sepayRef_idx";

-- DropIndex
DROP INDEX "Payment_sepayRef_key";

-- AlterTable
ALTER TABLE "Distance" ADD COLUMN     "teamSize" INTEGER,
ADD COLUMN     "type" "DistanceType" NOT NULL DEFAULT 'SOLO';

-- AlterTable
ALTER TABLE "Payment" DROP COLUMN "sepayRef";

-- CreateTable
CREATE TABLE "TeamMember" (
    "id" TEXT NOT NULL,
    "registrationId" TEXT NOT NULL,
    "memberIndex" INTEGER NOT NULL,
    "fullName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "dob" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TeamMember_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TeamMember_registrationId_idx" ON "TeamMember"("registrationId");

-- AddForeignKey
ALTER TABLE "TeamMember" ADD CONSTRAINT "TeamMember_registrationId_fkey" FOREIGN KEY ("registrationId") REFERENCES "Registration"("id") ON DELETE CASCADE ON UPDATE CASCADE;
