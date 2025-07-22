/*
  Warnings:

  - You are about to drop the `quote_template_items` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `quote_templates` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "quote_template_items" DROP CONSTRAINT "quote_template_items_templateId_fkey";

-- DropForeignKey
ALTER TABLE "quote_templates" DROP CONSTRAINT "quote_templates_userId_fkey";

-- AlterTable
ALTER TABLE "jobs" ADD COLUMN     "acceptedTradespersonId" TEXT,
ADD COLUMN     "depositPaid" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "depositPaymentIntentId" TEXT,
ADD COLUMN     "finalPaid" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "finalPaymentIntentId" TEXT;

-- DropTable
DROP TABLE "quote_template_items";

-- DropTable
DROP TABLE "quote_templates";

-- CreateTable
CREATE TABLE "QuoteTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuoteTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuoteTemplateItem" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "price" DECIMAL(65,30) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuoteTemplateItem_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "QuoteTemplate" ADD CONSTRAINT "QuoteTemplate_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuoteTemplateItem" ADD CONSTRAINT "QuoteTemplateItem_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "QuoteTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
