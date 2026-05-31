-- AlterTable Event: add disclaimer field
ALTER TABLE "Event" ADD COLUMN "disclaimer" TEXT;

-- AlterTable Registration: add disclaimer signature fields
ALTER TABLE "Registration" ADD COLUMN "disclaimerSignature" TEXT;
ALTER TABLE "Registration" ADD COLUMN "disclaimerSignedAt" TIMESTAMP(3);
