-- CreateEnum
CREATE TYPE "PaymentProvider" AS ENUM ('PAYOS', 'SEPAY');

-- AlterTable
ALTER TABLE "Admin" ADD COLUMN     "paymentProvider" "PaymentProvider" NOT NULL DEFAULT 'PAYOS',
ADD COLUMN     "sepayAccountName" TEXT,
ADD COLUMN     "sepayAccountNumber" TEXT,
ADD COLUMN     "sepayBankBin" TEXT,
ADD COLUMN     "sepayWebhookKey" TEXT;

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "provider" "PaymentProvider",
ADD COLUMN     "sepayTransactionId" TEXT,
ADD COLUMN     "transferCode" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Payment_transferCode_key" ON "Payment"("transferCode");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_sepayTransactionId_key" ON "Payment"("sepayTransactionId");

