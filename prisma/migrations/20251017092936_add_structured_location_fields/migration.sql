/*
  Warnings:

  - A unique constraint covering the columns `[depositPaymentIntentId]` on the table `jobs` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[finalPaymentIntentId]` on the table `jobs` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "jobs" ADD COLUMN     "city" TEXT,
ADD COLUMN     "formattedAddress" TEXT,
ADD COLUMN     "latitude" DOUBLE PRECISION,
ADD COLUMN     "longitude" DOUBLE PRECISION,
ADD COLUMN     "postcode" TEXT;

-- CreateTable
CREATE TABLE "webhook_events" (
    "id" TEXT NOT NULL,
    "processed" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "webhook_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "webhook_events_id_processed_idx" ON "webhook_events"("id", "processed");

-- CreateIndex
CREATE UNIQUE INDEX "jobs_depositPaymentIntentId_key" ON "jobs"("depositPaymentIntentId");

-- CreateIndex
CREATE UNIQUE INDEX "jobs_finalPaymentIntentId_key" ON "jobs"("finalPaymentIntentId");

-- CreateIndex
CREATE INDEX "jobs_postcode_idx" ON "jobs"("postcode");

-- CreateIndex
CREATE INDEX "jobs_city_idx" ON "jobs"("city");

-- CreateIndex
CREATE INDEX "jobs_latitude_longitude_idx" ON "jobs"("latitude", "longitude");
