-- CreateEnum
CREATE TYPE "ProcessingType" AS ENUM ('SUBGOAL_GENERATION', 'ACTION_GENERATION', 'TASK_GENERATION');

-- CreateEnum
CREATE TYPE "ProcessingStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'TIMEOUT', 'CANCELLED');

-- CreateTable
CREATE TABLE "processing_state" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "type" "ProcessingType" NOT NULL,
    "status" "ProcessingStatus" NOT NULL DEFAULT 'PENDING',
    "target_id" UUID,
    "progress" SMALLINT NOT NULL DEFAULT 0,
    "result" JSONB,
    "error" JSONB,
    "retry_count" SMALLINT NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "completed_at" TIMESTAMPTZ,

    CONSTRAINT "processing_state_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "processing_state_user_id_created_at_idx" ON "processing_state"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "processing_state_status_created_at_idx" ON "processing_state"("status", "created_at");

-- CreateIndex
CREATE INDEX "processing_state_type_status_idx" ON "processing_state"("type", "status");

-- AddForeignKey
ALTER TABLE "processing_state" ADD CONSTRAINT "processing_state_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
