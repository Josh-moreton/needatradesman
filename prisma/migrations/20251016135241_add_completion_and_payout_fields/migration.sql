-- AlterTable
ALTER TABLE "jobs" ADD COLUMN     "customerCompletedAt" TIMESTAMP(3),
ADD COLUMN     "customerConfirmedComplete" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "payoutReleased" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "payoutTransferId" TEXT,
ADD COLUMN     "tradespersonCompletedAt" TIMESTAMP(3),
ADD COLUMN     "tradespersonConfirmedComplete" BOOLEAN NOT NULL DEFAULT false;
