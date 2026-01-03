/*
  Warnings:

  - Added the required column `value` to the `Payment` table without a default value. This is not possible if the table is not empty.
  - Added the required column `totalPaid` to the `Sale` table without a default value. This is not possible if the table is not empty.
  - Added the required column `name` to the `SaleItem` table without a default value. This is not possible if the table is not empty.
  - Added the required column `subtotal` to the `SaleItem` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "value" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "costPrice" DECIMAL(65,30) NOT NULL DEFAULT 0,
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "Sale" ADD COLUMN     "change" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "totalPaid" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "SaleItem" ADD COLUMN     "name" TEXT NOT NULL,
ADD COLUMN     "subtotal" INTEGER NOT NULL;
