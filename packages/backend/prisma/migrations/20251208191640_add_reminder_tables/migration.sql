-- CreateEnum
CREATE TYPE "EmailStatus" AS ENUM ('SENT', 'FAILED', 'BOUNCED');

-- CreateEnum
CREATE TYPE "MoodPreference" AS ENUM ('STAY_ON_TRACK', 'CHANGE_PACE');

-- CreateTable
CREATE TABLE "reminder_logs" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "sentAt" TIMESTAMPTZ NOT NULL,
    "taskIds" UUID[],
    "emailStatus" "EmailStatus" NOT NULL,
    "messageId" VARCHAR(255),
    "errorMessage" TEXT,
    "retryCount" SMALLINT NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "reminder_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_reminder_preferences" (
    "userId" UUID NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "moodPreference" "MoodPreference",
    "lastReminderSentAt" TIMESTAMPTZ,
    "unsubscribedAt" TIMESTAMPTZ,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "user_reminder_preferences_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "habit_task_reminder_tracking" (
    "id" UUID NOT NULL,
    "taskId" UUID NOT NULL,
    "lastRemindedAt" TIMESTAMPTZ NOT NULL,
    "reminderCount" SMALLINT NOT NULL DEFAULT 0,
    "weekNumber" SMALLINT NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "habit_task_reminder_tracking_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "reminder_logs_userId_sentAt_idx" ON "reminder_logs"("userId", "sentAt");

-- CreateIndex
CREATE INDEX "reminder_logs_emailStatus_idx" ON "reminder_logs"("emailStatus");

-- CreateIndex
CREATE INDEX "reminder_logs_sentAt_idx" ON "reminder_logs"("sentAt");

-- CreateIndex
CREATE INDEX "user_reminder_preferences_enabled_idx" ON "user_reminder_preferences"("enabled");

-- CreateIndex
CREATE INDEX "user_reminder_preferences_lastReminderSentAt_idx" ON "user_reminder_preferences"("lastReminderSentAt");

-- CreateIndex
CREATE INDEX "habit_task_reminder_tracking_taskId_idx" ON "habit_task_reminder_tracking"("taskId");

-- CreateIndex
CREATE INDEX "habit_task_reminder_tracking_lastRemindedAt_idx" ON "habit_task_reminder_tracking"("lastRemindedAt");

-- CreateIndex
CREATE INDEX "habit_task_reminder_tracking_weekNumber_idx" ON "habit_task_reminder_tracking"("weekNumber");
