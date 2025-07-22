-- AlterTable
ALTER TABLE "applications" ADD COLUMN     "depositPercentage" INTEGER NOT NULL DEFAULT 50,
ADD COLUMN     "requiresDeposit" BOOLEAN NOT NULL DEFAULT true;
