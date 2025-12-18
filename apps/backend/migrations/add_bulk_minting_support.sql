-- Migration: Add bulk certificate minting support
-- Date: 2025-12-15
-- Description: Updates BatchIssuanceJob table for client-side signing workflow

-- Drop old columns if they exist (from queue-based approach)
ALTER TABLE batch_issuance_jobs DROP COLUMN IF EXISTS "jobId";
ALTER TABLE batch_issuance_jobs DROP COLUMN IF EXISTS "totalStudents";
ALTER TABLE batch_issuance_jobs DROP COLUMN IF EXISTS "studentIds";
ALTER TABLE batch_issuance_jobs DROP COLUMN IF EXISTS "templateId";
ALTER TABLE batch_issuance_jobs DROP COLUMN IF EXISTS "certificateData";
ALTER TABLE batch_issuance_jobs DROP COLUMN IF EXISTS "errorLog";

-- Add new columns for client-side signing approach
ALTER TABLE batch_issuance_jobs ADD COLUMN IF NOT EXISTS "universityId" TEXT NOT NULL DEFAULT '';
ALTER TABLE batch_issuance_jobs ADD COLUMN IF NOT EXISTS "totalCertificates" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE batch_issuance_jobs ADD COLUMN IF NOT EXISTS "certificateIds" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE batch_issuance_jobs ADD COLUMN IF NOT EXISTS "successfulMints" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE batch_issuance_jobs ADD COLUMN IF NOT EXISTS "failedMints" TEXT;

-- Update status enum to include CANCELLED (PostgreSQL doesn't enforce enum, just TEXT)
-- No changes needed for status column

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS "batch_issuance_jobs_universityId_idx" ON batch_issuance_jobs("universityId");
CREATE INDEX IF NOT EXISTS "batch_issuance_jobs_status_idx" ON batch_issuance_jobs("status");
CREATE INDEX IF NOT EXISTS "batch_issuance_jobs_createdAt_idx" ON batch_issuance_jobs("createdAt");

-- Update existing records to have empty universityId (if any exist)
-- UPDATE batch_issuance_jobs SET "universityId" = '' WHERE "universityId" IS NULL;

COMMENT ON TABLE batch_issuance_jobs IS 'Tracks bulk certificate issuance jobs with client-side wallet signing';
COMMENT ON COLUMN batch_issuance_jobs."universityId" IS 'ID of the university issuing certificates';
COMMENT ON COLUMN batch_issuance_jobs."certificateIds" IS 'Array of certificate IDs to be minted';
COMMENT ON COLUMN batch_issuance_jobs."successfulMints" IS 'Array of successfully minted certificate IDs';
COMMENT ON COLUMN batch_issuance_jobs."failedMints" IS 'JSON array of failed mints with error details';
