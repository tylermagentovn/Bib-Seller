-- Add bank info fields to Payment table
ALTER TABLE "Payment"
  ADD COLUMN IF NOT EXISTS "bankBin" TEXT,
  ADD COLUMN IF NOT EXISTS "bankAccountNumber" TEXT,
  ADD COLUMN IF NOT EXISTS "bankAccountName" TEXT;
