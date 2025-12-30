import { Router, Request, Response } from 'express';
import { verifyAccessToken, extractTokenFromHeader } from '../auth/jwt.js';
import { sseManager } from '../services/notification/sse.manager.js';
import { NotificationRole } from '../services/notification/notification.types.js';
import { logger } from '../utils/logger.js';

const router = Router();

/**
 * GET /api/notifications/stream
 *
 * Server-Sent Events endpoint for real-time notifications.
 * Supports authentication via:
 * 1. Authorization header: Bearer <token>
 * 2. Query parameter: ?token=<token>
 */
router.get('/stream', (req: Request, res: Response) => {
  try {
    // Extract token from header or query param
    const headerToken = extractTokenFromHeader(req.headers.authorization);
    const queryToken = req.query.token as string | undefined;
    const token = headerToken || queryToken;

    if (!token) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    // Verify token
    let payload;
    try {
      payload = verifyAccessToken(token);
    } catch (error) {
      res.status(401).json({ error: 'Invalid or expired token' });
      return;
    }

    // Validate user type
    const validRoles: NotificationRole[] = ['admin', 'super_admin', 'student'];
    if (!validRoles.includes(payload.type as NotificationRole)) {
      res.status(403).json({ error: 'Invalid user role' });
      return;
    }

    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering
    res.flushHeaders();

    // Add connection to SSE manager
    sseManager.addConnection(
      payload.sub,
      res,
      payload.type as NotificationRole,
      payload.universityId
    );

    logger.info(`SSE connection established for ${payload.type} ${payload.sub}`);

    // Handle client disconnect
    req.on('close', () => {
      sseManager.removeConnection(payload.sub, res);
      logger.info(`SSE connection closed for ${payload.type} ${payload.sub}`);
    });

    // Handle errors
    req.on('error', (error) => {
      logger.error(`SSE connection error for ${payload.sub}:`, error);
      sseManager.removeConnection(payload.sub, res);
    });

  } catch (error) {
    logger.error('SSE connection error:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

/**
 * GET /api/notifications/stats
 *
 * Get SSE connection statistics (admin only)
 */
router.get('/stats', (req: Request, res: Response) => {
  try {
    const headerToken = extractTokenFromHeader(req.headers.authorization);

    if (!headerToken) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    let payload;
    try {
      payload = verifyAccessToken(headerToken);
    } catch (error) {
      res.status(401).json({ error: 'Invalid or expired token' });
      return;
    }

    // Only super admins can view stats
    if (payload.type !== 'super_admin') {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    const stats = sseManager.getStats();
    res.json(stats);

  } catch (error) {
    logger.error('SSE stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
