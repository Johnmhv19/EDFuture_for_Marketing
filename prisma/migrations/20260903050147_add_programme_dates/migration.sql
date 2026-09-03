-- AlterTable
ALTER TABLE "Programme" ADD COLUMN "endDate" DATETIME;
ALTER TABLE "Programme" ADD COLUMN "startDate" DATETIME;

-- CreateIndex
CREATE INDEX "Programme_startDate_idx" ON "Programme"("startDate");

-- CreateIndex
CREATE INDEX "Programme_endDate_idx" ON "Programme"("endDate");
