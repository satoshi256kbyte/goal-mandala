-- CreateEnum
CREATE TYPE "WorkflowStatus" AS ENUM ('RUNNING', 'SUCCEEDED', 'FAILED', 'TIMED_OUT', 'ABORTED');

-- CreateTable
CREATE TABLE "workflow_executions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "executionArn" VARCHAR(500) NOT NULL,
    "goalId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "status" "WorkflowStatus" NOT NULL DEFAULT 'RUNNING',
    "startDate" TIMESTAMPTZ NOT NULL,
    "stopDate" TIMESTAMPTZ,
    "input" JSONB NOT NULL,
    "output" JSONB,
    "progressPercentage" SMALLINT NOT NULL DEFAULT 0,
    "processedActions" SMALLINT NOT NULL DEFAULT 0,
    "totalActions" SMALLINT NOT NULL,
    "currentBatch" SMALLINT NOT NULL DEFAULT 0,
    "totalBatches" SMALLINT NOT NULL,
    "estimatedTimeRemaining" INTEGER NOT NULL DEFAULT 0,
    "ttl" INTEGER,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "workflow_executions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "workflow_executions_executionArn_key" ON "workflow_executions"("executionArn");

-- CreateIndex (GSI for goalId)
CREATE INDEX "workflow_executions_goalId_createdAt_idx" ON "workflow_executions"("goalId", "createdAt");

-- CreateIndex
CREATE INDEX "workflow_executions_userId_createdAt_idx" ON "workflow_executions"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "workflow_executions_status_createdAt_idx" ON "workflow_executions"("status", "createdAt");

-- CreateIndex (for TTL cleanup)
CREATE INDEX "workflow_executions_ttl_idx" ON "workflow_executions"("ttl");
