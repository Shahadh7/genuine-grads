import { Response } from 'express';
import { NotificationResult, SSEEvent, NotificationRole } from './notification.types.js';
import { logger } from '../../utils/logger.js';

interface SSEConnection {
  response: Response;
  role: NotificationRole;
  userId: string;
  universityId?: string; // For students and university admins
  lastHeartbeat: number;
}

class SSEManager {
  private connections: Map<string, SSEConnection[]> = new Map();
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private readonly HEARTBEAT_INTERVAL = 30000; // 30 seconds
  private readonly CONNECTION_TIMEOUT = 120000; // 2 minutes

  constructor() {
    this.startHeartbeat();
  }

  /**
   * Add a new SSE connection for a user
   */
  addConnection(
    userId: string,
    response: Response,
    role: NotificationRole,
    universityId?: string
  ): void {
    const connection: SSEConnection = {
      response,
      role,
      userId,
      universityId,
      lastHeartbeat: Date.now(),
    };

    const userConnections = this.connections.get(userId) || [];
    userConnections.push(connection);
    this.connections.set(userId, userConnections);

    logger.info(`SSE connection added for user ${userId} (${role})`);

    // Send connected event
    this.sendEvent(response, {
      type: 'connected',
      data: { status: 'connected' },
    });
  }

  /**
   * Remove an SSE connection
   */
  removeConnection(userId: string, response: Response): void {
    const userConnections = this.connections.get(userId);
    if (!userConnections) return;

    const filtered = userConnections.filter((conn) => conn.response !== response);

    if (filtered.length === 0) {
      this.connections.delete(userId);
    } else {
      this.connections.set(userId, filtered);
    }

    logger.info(`SSE connection removed for user ${userId}`);
  }

  /**
   * Send a notification to a specific user
   */
  sendToUser(userId: string, notification: NotificationResult): void {
    const userConnections = this.connections.get(userId);
    if (!userConnections || userConnections.length === 0) {
      logger.debug(`No SSE connections for user ${userId}`);
      return;
    }

    const event: SSEEvent = {
      type: 'notification',
      data: notification,
    };

    for (const connection of userConnections) {
      try {
        this.sendEvent(connection.response, event);
        connection.lastHeartbeat = Date.now();
      } catch (error) {
        logger.error(`Failed to send notification to user ${userId}:`, error);
        // Connection might be dead, will be cleaned up by heartbeat
      }
    }
  }

  /**
   * Send a notification to all users with a specific role
   */
  sendToRole(role: NotificationRole, notification: NotificationResult): void {
    for (const [userId, connections] of this.connections) {
      for (const connection of connections) {
        if (connection.role === role) {
          try {
            this.sendEvent(connection.response, {
              type: 'notification',
              data: notification,
            });
            connection.lastHeartbeat = Date.now();
          } catch (error) {
            logger.error(`Failed to send notification to ${role} ${userId}:`, error);
          }
        }
      }
    }
  }

  /**
   * Send a notification to all admins of a specific university
   */
  sendToUniversityAdmins(universityId: string, notification: NotificationResult): void {
    for (const [userId, connections] of this.connections) {
      for (const connection of connections) {
        if (connection.role === 'admin' && connection.universityId === universityId) {
          try {
            this.sendEvent(connection.response, {
              type: 'notification',
              data: notification,
            });
            connection.lastHeartbeat = Date.now();
          } catch (error) {
            logger.error(`Failed to send notification to uni admin ${userId}:`, error);
          }
        }
      }
    }
  }

  /**
   * Send a notification to all super admins
   */
  sendToSuperAdmins(notification: NotificationResult): void {
    this.sendToRole('super_admin', notification);
  }

  /**
   * Get connection count for monitoring
   */
  getConnectionCount(): number {
    let count = 0;
    for (const connections of this.connections.values()) {
      count += connections.length;
    }
    return count;
  }

  /**
   * Get connection stats
   */
  getStats(): { totalConnections: number; userCount: number; byRole: Record<string, number> } {
    const byRole: Record<string, number> = {
      admin: 0,
      super_admin: 0,
      student: 0,
    };

    for (const connections of this.connections.values()) {
      for (const conn of connections) {
        byRole[conn.role] = (byRole[conn.role] || 0) + 1;
      }
    }

    return {
      totalConnections: this.getConnectionCount(),
      userCount: this.connections.size,
      byRole,
    };
  }

  /**
   * Send an SSE event to a response
   */
  private sendEvent(response: Response, event: SSEEvent): void {
    const data = JSON.stringify(event.data);
    response.write(`event: ${event.type}\n`);
    response.write(`data: ${data}\n\n`);
  }

  /**
   * Start heartbeat to keep connections alive and clean up dead ones
   */
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      const now = Date.now();

      for (const [userId, connections] of this.connections) {
        const activeConnections: SSEConnection[] = [];

        for (const connection of connections) {
          // Check if connection is still alive
          if (now - connection.lastHeartbeat > this.CONNECTION_TIMEOUT) {
            logger.info(`Removing stale SSE connection for user ${userId}`);
            try {
              connection.response.end();
            } catch {
              // Connection already closed
            }
            continue;
          }

          // Send heartbeat
          try {
            this.sendEvent(connection.response, {
              type: 'heartbeat',
              data: {},
            });
            connection.lastHeartbeat = now;
            activeConnections.push(connection);
          } catch {
            logger.info(`SSE connection dead for user ${userId}, removing`);
            try {
              connection.response.end();
            } catch {
              // Connection already closed
            }
          }
        }

        if (activeConnections.length === 0) {
          this.connections.delete(userId);
        } else {
          this.connections.set(userId, activeConnections);
        }
      }
    }, this.HEARTBEAT_INTERVAL);
  }

  /**
   * Stop the heartbeat (for cleanup)
   */
  stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /**
   * Close all connections (for shutdown)
   */
  closeAll(): void {
    this.stopHeartbeat();

    for (const connections of this.connections.values()) {
      for (const connection of connections) {
        try {
          connection.response.end();
        } catch {
          // Connection already closed
        }
      }
    }

    this.connections.clear();
    logger.info('All SSE connections closed');
  }
}

// Singleton instance
export const sseManager = new SSEManager();
export default sseManager;
