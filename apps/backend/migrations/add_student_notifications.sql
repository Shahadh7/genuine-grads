-- Migration: Add StudentNotification table for in-app notifications
-- Created: 2024-12-30
-- Description: Adds the student_notifications table and required enums for the in-app notification system

-- Create the StudentNotificationType enum if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'StudentNotificationType') THEN
        CREATE TYPE "StudentNotificationType" AS ENUM (
            'CERTIFICATE_ISSUED',
            'CERTIFICATE_MINTED',
            'CERTIFICATE_REVOKED',
            'CERTIFICATE_VERIFIED',
            'ZK_COMMITMENT_REGISTERED',
            'ZK_PROOF_UPLOADED',
            'ZK_PROOF_VERIFIED',
            'ZK_PROOF_FAILED',
            'ACHIEVEMENT_AWARDED',
            'ENROLLMENT_ADDED',
            'SECURITY_NEW_LOGIN',
            'SECURITY_WALLET_LINKED',
            'SYSTEM_ANNOUNCEMENT'
        );
    END IF;
END $$;

-- Create the StudentNotificationPriority enum if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'StudentNotificationPriority') THEN
        CREATE TYPE "StudentNotificationPriority" AS ENUM (
            'LOW',
            'NORMAL',
            'HIGH',
            'URGENT'
        );
    END IF;
END $$;

-- Create the student_notifications table if it doesn't exist
CREATE TABLE IF NOT EXISTS "student_notifications" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "type" "StudentNotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "priority" "StudentNotificationPriority" NOT NULL DEFAULT 'NORMAL',
    "metadata" JSONB,
    "actionUrl" TEXT,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "student_notifications_pkey" PRIMARY KEY ("id")
);

-- Add foreign key constraint if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'student_notifications_studentId_fkey'
        AND table_name = 'student_notifications'
    ) THEN
        ALTER TABLE "student_notifications"
        ADD CONSTRAINT "student_notifications_studentId_fkey"
        FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS "student_notifications_studentId_read_idx" ON "student_notifications"("studentId", "read");
CREATE INDEX IF NOT EXISTS "student_notifications_studentId_createdAt_idx" ON "student_notifications"("studentId", "createdAt");
CREATE INDEX IF NOT EXISTS "student_notifications_type_idx" ON "student_notifications"("type");

-- Log success
DO $$ BEGIN RAISE NOTICE 'StudentNotification table migration completed successfully'; END $$;
