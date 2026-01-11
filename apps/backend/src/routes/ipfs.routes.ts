import { Router, Request, Response } from 'express';
import axios from 'axios';
import { logger } from '../utils/logger.js';
import { env } from '../env.js';

const router = Router();

/**
 * SECURITY: Validate IPFS URL against allowed gateways
 * Uses proper URL parsing to prevent SSRF bypass attacks
 */
function isAllowedIpfsUrl(urlString: string): { valid: boolean; error?: string } {
  // Parse the URL properly to prevent bypass attacks
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(urlString);
  } catch {
    return { valid: false, error: 'Invalid URL format' };
  }

  // Must be HTTPS
  if (parsedUrl.protocol !== 'https:') {
    return { valid: false, error: 'Only HTTPS URLs are allowed' };
  }

  // Define allowed gateway hostnames (exact match, not prefix)
  const allowedHosts = new Set([
    new URL(env.PINATA_GATEWAY).hostname,
    'gateway.pinata.cloud',
    'ipfs.io',
    'cloudflare-ipfs.com',
  ]);

  // Check exact hostname match
  if (!allowedHosts.has(parsedUrl.hostname)) {
    return { valid: false, error: 'URL must be from an allowed IPFS gateway' };
  }

  // Prevent localhost/internal IP bypass via DNS rebinding or similar
  // Block private IP ranges that might be resolved via DNS
  const blockedPatterns = [
    /^localhost$/i,
    /^127\./,
    /^10\./,
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
    /^192\.168\./,
    /^0\./,
    /^169\.254\./,  // Link-local
    /^\[::1\]$/,    // IPv6 localhost
  ];

  if (blockedPatterns.some(pattern => pattern.test(parsedUrl.hostname))) {
    return { valid: false, error: 'Access to internal addresses is not allowed' };
  }

  // Validate path contains IPFS hash pattern (CIDv0 or CIDv1)
  const ipfsPathRegex = /^\/ipfs\/[a-zA-Z0-9]+/;
  if (!ipfsPathRegex.test(parsedUrl.pathname)) {
    return { valid: false, error: 'URL must contain a valid IPFS path' };
  }

  return { valid: true };
}

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

    // SECURITY: Validate URL using proper URL parsing
    const validation = isAllowedIpfsUrl(url);
    if (!validation.valid) {
      logger.warn({ url, error: validation.error }, 'Blocked IPFS proxy request');
      return res.status(403).json({
        success: false,
        error: validation.error,
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
 * SECURITY: Validate IPFS hash format (CIDv0 or CIDv1)
 */
function isValidIpfsHash(hash: string): boolean {
  // CIDv0: starts with Qm, 46 characters, base58
  const cidV0Regex = /^Qm[1-9A-HJ-NP-Za-km-z]{44}$/;
  // CIDv1: starts with b (base32) or z (base58btc), variable length
  const cidV1Regex = /^[bz][a-zA-Z0-9]{50,}$/;
  // Simple alphanumeric pattern for backwards compatibility
  const simpleRegex = /^[a-zA-Z0-9]{46,64}$/;

  return cidV0Regex.test(hash) || cidV1Regex.test(hash) || simpleRegex.test(hash);
}

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

    // SECURITY: Validate IPFS hash format to prevent path traversal
    if (!isValidIpfsHash(hash)) {
      logger.warn({ hash }, 'Invalid IPFS hash format rejected');
      return res.status(400).json({
        success: false,
        error: 'Invalid IPFS hash format',
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




