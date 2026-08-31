-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ProgrammeFile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "programmeId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'UPLOAD',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "displayName" TEXT NOT NULL,
    "originalName" TEXT,
    "storageKey" TEXT,
    "url" TEXT,
    "mimeType" TEXT,
    "sizeBytes" INTEGER,
    "caption" TEXT,
    "uploadedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "uploadedBy" TEXT,
    CONSTRAINT "ProgrammeFile_programmeId_fkey" FOREIGN KEY ("programmeId") REFERENCES "Programme" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_ProgrammeFile" ("caption", "category", "displayName", "id", "mimeType", "originalName", "programmeId", "sizeBytes", "status", "storageKey", "uploadedAt", "uploadedBy") SELECT "caption", "category", "displayName", "id", "mimeType", "originalName", "programmeId", "sizeBytes", "status", "storageKey", "uploadedAt", "uploadedBy" FROM "ProgrammeFile";
DROP TABLE "ProgrammeFile";
ALTER TABLE "new_ProgrammeFile" RENAME TO "ProgrammeFile";
CREATE UNIQUE INDEX "ProgrammeFile_storageKey_key" ON "ProgrammeFile"("storageKey");
CREATE INDEX "ProgrammeFile_programmeId_category_idx" ON "ProgrammeFile"("programmeId", "category");
CREATE INDEX "ProgrammeFile_type_idx" ON "ProgrammeFile"("type");
CREATE INDEX "ProgrammeFile_status_idx" ON "ProgrammeFile"("status");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
