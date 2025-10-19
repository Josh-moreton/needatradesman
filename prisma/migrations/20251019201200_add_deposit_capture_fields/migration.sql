-- AlterTable
ALTER TABLE "jobs" ADD COLUMN "depositCaptured" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "depositCapturedAt" TIMESTAMP(3),
ADD COLUMN "depositCancelledAt" TIMESTAMP(3);
