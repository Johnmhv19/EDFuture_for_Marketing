-- CreateTable
CREATE TABLE "Programme" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "pathway" TEXT NOT NULL,
    "yearLevel" TEXT,
    "partners" TEXT,
    "venue" TEXT,
    "dates" TEXT,
    "status" TEXT NOT NULL DEFAULT 'Confirmed',
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ProgrammeFile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "programmeId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "displayName" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "caption" TEXT,
    "uploadedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "uploadedBy" TEXT,
    CONSTRAINT "ProgrammeFile_programmeId_fkey" FOREIGN KEY ("programmeId") REFERENCES "Programme" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Programme_name_key" ON "Programme"("name");

-- CreateIndex
CREATE INDEX "Programme_level_idx" ON "Programme"("level");

-- CreateIndex
CREATE INDEX "Programme_pathway_idx" ON "Programme"("pathway");

-- CreateIndex
CREATE INDEX "Programme_status_idx" ON "Programme"("status");

-- CreateIndex
CREATE UNIQUE INDEX "ProgrammeFile_storageKey_key" ON "ProgrammeFile"("storageKey");

-- CreateIndex
CREATE INDEX "ProgrammeFile_programmeId_category_idx" ON "ProgrammeFile"("programmeId", "category");

-- CreateIndex
CREATE INDEX "ProgrammeFile_status_idx" ON "ProgrammeFile"("status");
