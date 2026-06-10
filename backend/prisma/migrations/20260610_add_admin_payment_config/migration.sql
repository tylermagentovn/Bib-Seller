-- Add PayOS payment gateway config fields to Admin
ALTER TABLE "Admin" ADD COLUMN "payosClientId" TEXT;
ALTER TABLE "Admin" ADD COLUMN "payosApiKey" TEXT;
ALTER TABLE "Admin" ADD COLUMN "payosChecksumKey" TEXT;
