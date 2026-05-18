/**
 * SentinelAI Real-Time Socket.io Service
 * Manages WebSocket connections, enforces JWT handshakes, and routes threat telemetry.
 */

const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'jwtsecret12345';

class SocketService {
  constructor() {
    this.io = null;
  }

  /**
   * Initialize Socket.io Server instance
   * @param {Object} server Native Node HTTP Server
   */
  init(server) {
    this.io = new Server(server, {
      cors: {
        origin: process.env.FRONTEND_URL || '*',
        methods: ['GET', 'POST'],
        credentials: true,
      },
      pingTimeout: 60000,
    });

    console.log('[socketService] Socket.io gateway server established.');

    // Secure Socket Middleware: Validate JWT before allowing connection handshake
    this.io.use((socket, next) => {
      try {
        const token = socket.handshake.auth?.token || 
                      socket.handshake.headers?.authorization?.split(' ')[1] || 
                      socket.handshake.query?.token;

        if (!token) {
          console.warn('[socketService] Refused connection: Missing bearer handshake token.');
          return next(new Error('Authentication error: Handshake bearer token required.'));
        }

        const decoded = jwt.verify(token, JWT_SECRET);
        socket.user = decoded; // Bind authenticated user meta to the socket
        next();
      } catch (err) {
        console.warn(`[socketService] Refused connection: Token verification failed (${err.message})`);
        return next(new Error('Authentication error: Invalid or expired access token.'));
      }
    });

    // Connection handler
    this.io.on('connection', (socket) => {
      const user = socket.user;
      console.log(`[socketService] Analyst connected: ${user.email} (ID: ${user.id}, Role: ${user.role}, Socket: ${socket.id})`);

      // Bind connection to room specific to user ID to support target unicasting
      socket.join(`user:${user.id}`);
      
      // If user is a SOC analyst/admin, let them join the secure operational threat room
      if (user.role === 'analyst' || user.role === 'admin') {
        socket.join('soc_operational_feed');
        console.log(`[socketService] Socket ${socket.id} joined 'soc_operational_feed' room`);
      }

      socket.on('disconnect', () => {
        console.log(`[socketService] Socket disconnected: ${socket.id} for user ${user.email}`);
      });
    });
  }

  /**
   * Broadcast real-time threat detection to all active SOC analyst clients
   * @param {string} event Event tag (e.g. 'scan:completed')
   * @param {Object} payload Scanned URL metadata and threat statistics
   */
  broadcastThreat(event, payload) {
    if (!this.io) {
      console.warn('[socketService] Cannot broadcast: Socket.io is not initialized.');
      return;
    }
    // Stream only to clients in the operational feed room to secure threat telemetry data
    this.io.to('soc_operational_feed').emit(event, payload);
    console.log(`[socketService] Broadcasted threat event [${event}] to SOC operations room.`);
  }

  /**
   * Unicast real-time scan updates to a specific user
   * @param {string} userId Destination user ID
   * @param {string} event Event tag
   * @param {Object} payload Scan outcome payload
   */
  sendToUser(userId, event, payload) {
    if (!this.io) return;
    this.io.to(`user:${userId}`).emit(event, payload);
    console.log(`[socketService] Dispatched event [${event}] privately to user room: user:${userId}`);
  }
}

// Export singleton instance
module.exports = new SocketService();
