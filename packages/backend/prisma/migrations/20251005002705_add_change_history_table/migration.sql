-- CreateTable
CREATE TABLE "change_history" (
    "id" UUID NOT NULL,
    "entity_type" VARCHAR(20) NOT NULL,
    "entity_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "changed_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "changes" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "change_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "change_history_entity_type_entity_id_changed_at_idx" ON "change_history"("entity_type", "entity_id", "changed_at");

-- CreateIndex
CREATE INDEX "change_history_user_id_changed_at_idx" ON "change_history"("user_id", "changed_at");

-- AddForeignKey
ALTER TABLE "change_history" ADD CONSTRAINT "change_history_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
