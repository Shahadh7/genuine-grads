-- Add VerificationLog table to track certificate verification events
-- This migration adds the verification_logs table to all university databases

-- Create verification_logs table
CREATE TABLE IF NOT EXISTS "verification_logs" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "certificateId" TEXT NOT NULL,
    "verifiedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "verificationType" TEXT NOT NULL DEFAULT 'PUBLIC',
    "verificationStatus" TEXT NOT NULL DEFAULT 'SUCCESS',
    "verifierIpAddress" TEXT,
    "verifierLocation" TEXT,
    "verifierUserAgent" TEXT,
    "certificateNumber" TEXT NOT NULL,
    "mintAddress" TEXT NOT NULL,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "verification_logs_pkey" PRIMARY KEY ("id")
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS "verification_logs_studentId_idx" ON "verification_logs"("studentId");
CREATE INDEX IF NOT EXISTS "verification_logs_certificateId_idx" ON "verification_logs"("certificateId");
CREATE INDEX IF NOT EXISTS "verification_logs_verifiedAt_idx" ON "verification_logs"("verifiedAt");
CREATE INDEX IF NOT EXISTS "verification_logs_verificationStatus_idx" ON "verification_logs"("verificationStatus");
CREATE INDEX IF NOT EXISTS "verification_logs_mintAddress_idx" ON "verification_logs"("mintAddress");

-- Add foreign key constraints
ALTER TABLE "verification_logs"
ADD CONSTRAINT "verification_logs_studentId_fkey"
FOREIGN KEY ("studentId")
REFERENCES "students"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;

ALTER TABLE "verification_logs"
ADD CONSTRAINT "verification_logs_certificateId_fkey"
FOREIGN KEY ("certificateId")
REFERENCES "certificates"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Successfully created verification_logs table and indexes';
END $$;
