-- CreateEnum
CREATE TYPE "ChargeModel" AS ENUM ('DESTINATION_CHARGE', 'SC_AND_T');

-- AlterTable
ALTER TABLE "jobs" ADD COLUMN     "chargeModel" "ChargeModel" DEFAULT 'DESTINATION_CHARGE',
ADD COLUMN     "depositChargeId" TEXT,
ADD COLUMN     "depositReleasedAt" TIMESTAMP(3),
ADD COLUMN     "depositTransferId" TEXT,
ADD COLUMN     "finalChargeId" TEXT,
ADD COLUMN     "finalReleasedAt" TIMESTAMP(3),
ADD COLUMN     "finalTransferId" TEXT,
ADD COLUMN     "transferGroup" TEXT;
