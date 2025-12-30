import { Router, Request, Response } from 'express';
import axios from 'axios';
import { logger } from '../utils/logger.js';
import { env } from '../env.js';

const router = Router();

/**
 * GET /api/ipfs/proxy
 * Proxy requests to IPFS gateway to avoid CORS issues
 * Query params: url (the full IPFS URL to fetch)
 */
router.get('/proxy', async (req: Request, res: Response) => {
  try {
    const { url } = req.query;

    if (!url || typeof url !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'URL parameter is required',
      });
    }

    // Validate that the URL is from an allowed IPFS gateway
    const allowedGateways = [
      env.PINATA_GATEWAY,
      'https://gateway.pinata.cloud',
      'https://ipfs.io',
      'https://cloudflare-ipfs.com',
    ];

    const isAllowedGateway = allowedGateways.some((gateway) =>
      url.startsWith(gateway)
    );

    if (!isAllowedGateway) {
      return res.status(403).json({
        success: false,
        error: 'URL must be from an allowed IPFS gateway',
      });
    }

    logger.info({ url }, 'Proxying IPFS request');

    // Fetch the data from IPFS
    const response = await axios.get(url, {
      timeout: 30000, // 30 second timeout
      responseType: 'arraybuffer', // Support both JSON and binary data
    });

    // Get content type from the response
    const contentType = response.headers['content-type'] || 'application/octet-stream';

    // Set appropriate headers
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable'); // Cache for 1 year
    res.setHeader('Access-Control-Allow-Origin', '*'); // Allow all origins for IPFS data

    // Send the data
    return res.send(response.data);
  } catch (error: any) {
    logger.error({ error: error.message, url: req.query.url }, 'Failed to proxy IPFS request');
    
    if (error.response) {
      return res.status(error.response.status).json({
        success: false,
        error: `IPFS gateway returned ${error.response.status}`,
      });
    }

    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch from IPFS',
    });
  }
});

/**
 * GET /api/ipfs/metadata/:hash
 * Fetch metadata JSON from IPFS by hash
 */
router.get('/metadata/:hash', async (req: Request, res: Response) => {
  try {
    const { hash } = req.params;

    if (!hash) {
      return res.status(400).json({
        success: false,
        error: 'IPFS hash is required',
      });
    }

    const url = `${env.PINATA_GATEWAY}/ipfs/${hash}`;
    logger.info({ hash, url }, 'Fetching IPFS metadata');

    const response = await axios.get(url, {
      timeout: 30000,
    });

    // Set cache headers
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.setHeader('Access-Control-Allow-Origin', '*');

    return res.json(response.data);
  } catch (error: any) {
    logger.error({ error: error.message, hash: req.params.hash }, 'Failed to fetch IPFS metadata');
    
    if (error.response) {
      return res.status(error.response.status).json({
        success: false,
        error: `IPFS gateway returned ${error.response.status}`,
      });
    }

    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch metadata from IPFS',
    });
  }
});

export default router;

