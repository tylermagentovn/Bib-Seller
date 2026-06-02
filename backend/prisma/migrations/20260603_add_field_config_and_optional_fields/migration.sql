-- AlterTable
ALTER TABLE "Event" ADD COLUMN "fieldConfig" JSONB;

-- AlterTable
ALTER TABLE "Registration" ADD COLUMN "bloodType" TEXT,
ADD COLUMN "idNumber" TEXT,
ADD COLUMN "medicalConditions" TEXT,
ADD COLUMN "shirtSize" TEXT,
ALTER COLUMN "fullName" DROP NOT NULL,
ALTER COLUMN "phone" DROP NOT NULL,
ALTER COLUMN "email" DROP NOT NULL,
ALTER COLUMN "dob" DROP NOT NULL,
ALTER COLUMN "emergencyName" DROP NOT NULL,
ALTER COLUMN "emergencyPhone" DROP NOT NULL;
