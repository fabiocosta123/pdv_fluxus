-- AlterTable
ALTER TABLE "CustomerLedgerEntry" ADD COLUMN "dueDate" DATE,
ADD COLUMN "paidOn" DATE,
ADD COLUMN "interest" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "discount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "settledById" TEXT;

-- Backfill
UPDATE "CustomerLedgerEntry"
SET "dueDate" = (("createdAt" AT TIME ZONE 'UTC') AT TIME ZONE 'America/Sao_Paulo')::date
WHERE "type" = 'CHARGE' AND "dueDate" IS NULL;

UPDATE "CustomerLedgerEntry"
SET "paidOn" = (("createdAt" AT TIME ZONE 'UTC') AT TIME ZONE 'America/Sao_Paulo')::date
WHERE "type" = 'PAYMENT' AND "paidOn" IS NULL;

-- CreateIndex
CREATE INDEX "CustomerLedgerEntry_paidOn_idx" ON "CustomerLedgerEntry"("paidOn");

-- CreateIndex
CREATE INDEX "CustomerLedgerEntry_settledById_idx" ON "CustomerLedgerEntry"("settledById");

-- AddForeignKey
ALTER TABLE "CustomerLedgerEntry" ADD CONSTRAINT "CustomerLedgerEntry_settledById_fkey" FOREIGN KEY ("settledById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
