-- CreateEnum
CREATE TYPE "EmailEventStatus" AS ENUM ('PENDING', 'SENT', 'FAILED', 'SUPPRESSED');

-- CreateEnum
CREATE TYPE "DigestFrequency" AS ENUM ('DAILY', 'WEEKLY', 'NEVER');

-- CreateEnum
CREATE TYPE "SuppressionReason" AS ENUM ('BOUNCE', 'COMPLAINT', 'MANUAL_UNSUBSCRIBE', 'ABUSE');

-- CreateTable
CREATE TABLE "email_events" (
    "id" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "payloadHash" TEXT NOT NULL,
    "status" "EmailEventStatus" NOT NULL DEFAULT 'PENDING',
    "messageId" TEXT,
    "recipientEmail" TEXT NOT NULL,
    "subject" TEXT,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" TIMESTAMP(3),

    CONSTRAINT "email_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_preferences" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "allowTransactional" BOOLEAN NOT NULL DEFAULT true,
    "allowDigest" BOOLEAN NOT NULL DEFAULT true,
    "digestFrequency" "DigestFrequency" NOT NULL DEFAULT 'WEEKLY',
    "professionFilters" "JobCategory"[],
    "regionFilters" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "email_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_suppressions" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "email" TEXT NOT NULL,
    "reason" "SuppressionReason" NOT NULL,
    "source" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_suppressions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "email_events_idempotencyKey_key" ON "email_events"("idempotencyKey");

-- CreateIndex
CREATE INDEX "email_events_idempotencyKey_idx" ON "email_events"("idempotencyKey");

-- CreateIndex
CREATE INDEX "email_events_eventType_createdAt_idx" ON "email_events"("eventType", "createdAt");

-- CreateIndex
CREATE INDEX "email_events_recipientEmail_createdAt_idx" ON "email_events"("recipientEmail", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "email_preferences_userId_key" ON "email_preferences"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "email_suppressions_email_reason_key" ON "email_suppressions"("email", "reason");

-- CreateIndex
CREATE INDEX "email_suppressions_email_idx" ON "email_suppressions"("email");

-- AddForeignKey
ALTER TABLE "email_preferences" ADD CONSTRAINT "email_preferences_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_suppressions" ADD CONSTRAINT "email_suppressions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
