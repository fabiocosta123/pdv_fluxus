-- CreateEnum
CREATE TYPE "PrintWidth" AS ENUM ('MM58', 'MM80');

-- CreateTable
CREATE TABLE "StoreSettings" (
    "id" TEXT NOT NULL DEFAULT 'store',
    "tradeName" TEXT NOT NULL DEFAULT 'Restaurante Daju',
    "address" TEXT NOT NULL DEFAULT 'Rua Meraldo Previdi',
    "cnpj" TEXT NOT NULL DEFAULT '32905822000108',
    "phone" TEXT,
    "footer" TEXT NOT NULL DEFAULT 'Obrigado pela preferência!',
    "printWidth" "PrintWidth" NOT NULL DEFAULT 'MM80',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StoreSettings_pkey" PRIMARY KEY ("id")
);
