-- Fix certificates that were minted on-chain but database update failed
-- These certificates have transaction signatures but status is still PENDING

-- First, check which certificates need fixing
SELECT
    id,
    "certificateNumber",
    status,
    "transactionSignature",
    "issuedAt"
FROM certificates
WHERE status = 'PENDING'
  AND "transactionSignature" IS NOT NULL
ORDER BY "issuedAt" DESC;

-- Update them to MINTED status
-- Uncomment the line below to actually update:
-- UPDATE certificates SET status = 'MINTED' WHERE status = 'PENDING' AND "transactionSignature" IS NOT NULL;
