SELECT 
  "certificateNumber",
  "badgeTitle",
  "ipfsUri",
  LEFT("metadataJson", 200) as metadata_preview
FROM mint_activity_logs
WHERE status = 'SUCCESS'
LIMIT 3;
