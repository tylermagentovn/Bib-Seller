CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "fullName" TEXT,
    "phone" TEXT,
    "dob" TIMESTAMP(3),
    "idNumber" TEXT,
    "shirtSize" TEXT,
    "bloodType" TEXT,
    "medicalConditions" TEXT,
    "emergencyName" TEXT,
    "emergencyPhone" TEXT,
    "gender" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

ALTER TABLE "Registration" ADD COLUMN "userId" TEXT;

ALTER TABLE "Registration" ADD CONSTRAINT "Registration_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "Registration_userId_idx" ON "Registration"("userId");
