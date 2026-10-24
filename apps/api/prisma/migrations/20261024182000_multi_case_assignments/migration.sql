-- DropIndex
DROP INDEX "Assignment_studyId_caseId_idx";

-- DropIndex
DROP INDEX "Vote_assignmentId_key";

-- AlterTable
ALTER TABLE "Assignment" DROP COLUMN "caseId",
ADD COLUMN     "caseIds" TEXT[];

-- AlterTable
ALTER TABLE "Study" ADD COLUMN     "casesPerParticipant" INTEGER NOT NULL DEFAULT 1;

-- CreateIndex
CREATE INDEX "Assignment_studyId_idx" ON "Assignment"("studyId");

-- CreateIndex
CREATE UNIQUE INDEX "Vote_assignmentId_caseId_key" ON "Vote"("assignmentId", "caseId");

