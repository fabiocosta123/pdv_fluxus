-- CreateEnum
CREATE TYPE "CustomerStatus" AS ENUM ('ACTIVE', 'BLOCKED');

-- CreateEnum
CREATE TYPE "LedgerEntryType" AS ENUM ('CHARGE', 'PAYMENT');

-- AlterTable
ALTER TABLE "Customer" ADD COLUMN "birthDate" DATE,
ADD COLUMN "phone" TEXT;

ALTER TABLE "Customer" ALTER COLUMN "creditLimit" DROP NOT NULL;
ALTER TABLE "Customer" ALTER COLUMN "creditLimit" DROP DEFAULT;
UPDATE "Customer" SET "creditLimit" = NULL WHERE "creditLimit" = 0;

ALTER TABLE "Customer" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Customer" ALTER COLUMN "status" TYPE "CustomerStatus" USING (
  CASE
    WHEN "status" = 'BLOCKED' THEN 'BLOCKED'::"CustomerStatus"
    ELSE 'ACTIVE'::"CustomerStatus"
  END
);
ALTER TABLE "Customer" ALTER COLUMN "status" SET DEFAULT 'ACTIVE';

-- CreateTable
CREATE TABLE "CustomerLedgerEntry" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "type" "LedgerEntryType" NOT NULL,
    "amount" INTEGER NOT NULL,
    "balanceAfter" INTEGER NOT NULL,
    "method" "PaymentMethod",
    "note" TEXT,
    "saleId" TEXT,
    "cashierSessionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CustomerLedgerEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CustomerLedgerEntry_saleId_key" ON "CustomerLedgerEntry"("saleId");

-- CreateIndex
CREATE INDEX "CustomerLedgerEntry_customerId_createdAt_idx" ON "CustomerLedgerEntry"("customerId", "createdAt");

-- CreateIndex
CREATE INDEX "CustomerLedgerEntry_cashierSessionId_idx" ON "CustomerLedgerEntry"("cashierSessionId");

-- CreateIndex
CREATE INDEX "Sale_customerId_idx" ON "Sale"("customerId");

-- AddForeignKey
ALTER TABLE "CustomerLedgerEntry" ADD CONSTRAINT "CustomerLedgerEntry_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerLedgerEntry" ADD CONSTRAINT "CustomerLedgerEntry_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sale"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerLedgerEntry" ADD CONSTRAINT "CustomerLedgerEntry_cashierSessionId_fkey" FOREIGN KEY ("cashierSessionId") REFERENCES "CashierSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;
