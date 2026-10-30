-- CreateEnum
CREATE TYPE "RefundStatus" AS ENUM ('REQUESTED', 'APPROVED', 'PROCESSING', 'COMPLETED', 'REJECTED');

-- AlterTable
ALTER TABLE "orders" ALTER COLUMN "whatsappConsent" SET DEFAULT false,
ALTER COLUMN "whatsappConsentAt" DROP NOT NULL,
ALTER COLUMN "whatsappConsentAt" DROP DEFAULT;

-- CreateTable
CREATE TABLE "refund_records" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "amountPaise" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "status" "RefundStatus" NOT NULL DEFAULT 'REQUESTED',
    "reason" TEXT NOT NULL,
    "source" "RequestSource" NOT NULL DEFAULT 'WHATSAPP',
    "adminNotes" TEXT,
    "transactionReference" TEXT,
    "processedByAdminId" TEXT,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "refund_records_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "refund_records_orderId_idx" ON "refund_records"("orderId");

-- AddForeignKey
ALTER TABLE "refund_records" ADD CONSTRAINT "refund_records_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
