-- Add PayOS fields to Payment table
ALTER TABLE "Payment"
  ADD COLUMN IF NOT EXISTS "payosOrderCode" TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS "checkoutUrl" TEXT,
  ADD COLUMN IF NOT EXISTS "payosRef" TEXT;

CREATE INDEX IF NOT EXISTS "Payment_payosOrderCode_idx" ON "Payment"("payosOrderCode");
