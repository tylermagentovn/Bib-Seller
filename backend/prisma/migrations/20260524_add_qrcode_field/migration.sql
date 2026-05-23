-- Add qrCode field to Payment table
ALTER TABLE "Payment"
  ADD COLUMN IF NOT EXISTS "qrCode" TEXT;
