-- AlterTable: add extended fields to TeamMember and make dob optional
ALTER TABLE "TeamMember" ALTER COLUMN "dob" DROP NOT NULL;
ALTER TABLE "TeamMember" ADD COLUMN "idNumber" TEXT;
ALTER TABLE "TeamMember" ADD COLUMN "shirtSize" TEXT;
ALTER TABLE "TeamMember" ADD COLUMN "bloodType" TEXT;
ALTER TABLE "TeamMember" ADD COLUMN "medicalConditions" TEXT;
ALTER TABLE "TeamMember" ADD COLUMN "emergencyName" TEXT;
ALTER TABLE "TeamMember" ADD COLUMN "emergencyPhone" TEXT;
