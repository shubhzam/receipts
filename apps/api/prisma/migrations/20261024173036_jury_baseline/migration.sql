-- CreateTable
CREATE TABLE "Case" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "claimText" TEXT NOT NULL,
    "factsJson" JSONB NOT NULL,
    "merchantShouldWin" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Case_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Reply" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "model" TEXT NOT NULL,

    CONSTRAINT "Reply_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Study" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "round" TEXT NOT NULL,
    "replyVersion" TEXT NOT NULL,
    "targetVotesPerCase" INTEGER NOT NULL,
    "teracOpportunityId" TEXT,
    "status" TEXT NOT NULL,
    "launchedAt" TIMESTAMP(3),

    CONSTRAINT "Study_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Assignment" (
    "id" TEXT NOT NULL,
    "studyId" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "teracSubmissionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Assignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vote" (
    "id" TEXT NOT NULL,
    "assignmentId" TEXT NOT NULL,
    "studyId" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "merchantWins" BOOLEAN NOT NULL,
    "confidence" INTEGER NOT NULL,
    "weaknessTags" TEXT[],
    "weaknessText" TEXT,
    "checkPassed" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Vote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Case_key_key" ON "Case"("key");

-- CreateIndex
CREATE UNIQUE INDEX "Reply_caseId_version_key" ON "Reply"("caseId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "Study_key_key" ON "Study"("key");

-- CreateIndex
CREATE UNIQUE INDEX "Study_teracOpportunityId_key" ON "Study"("teracOpportunityId");

-- CreateIndex
CREATE UNIQUE INDEX "Assignment_teracSubmissionId_key" ON "Assignment"("teracSubmissionId");

-- CreateIndex
CREATE INDEX "Assignment_studyId_caseId_idx" ON "Assignment"("studyId", "caseId");

-- CreateIndex
CREATE UNIQUE INDEX "Vote_assignmentId_key" ON "Vote"("assignmentId");

-- CreateIndex
CREATE INDEX "Vote_studyId_caseId_idx" ON "Vote"("studyId", "caseId");

-- AddForeignKey
ALTER TABLE "Reply" ADD CONSTRAINT "Reply_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
