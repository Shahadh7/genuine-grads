import { Router, Request, Response } from 'express';
import multer from 'multer';
import { uploadFileToIPFS } from '../services/ipfs/pinata.service.js';
import { logger } from '../utils/logger.js';

const router = Router();

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept only image files
    const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only image files (JPEG, PNG, GIF, WEBP) are allowed'));
    }
  },
});

/**
 * POST /api/upload/logo
 * Upload a university logo to IPFS via Pinata
 */
router.post('/logo', upload.single('logo'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file provided',
      });
    }

    logger.info(
      {
        fileName: req.file.originalname,
        size: req.file.size,
        mimeType: req.file.mimetype,
      },
      'Uploading logo to IPFS'
    );

    // Upload to Pinata
    const ipfsUrl = await uploadFileToIPFS(req.file.buffer, req.file.originalname);

    logger.info({ ipfsUrl }, 'Logo uploaded successfully');

    return res.json({
      success: true,
      url: ipfsUrl,
    });
  } catch (error: any) {
    logger.error({ error: error.message }, 'Failed to upload logo');
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to upload file',
    });
  }
});

export default router;
