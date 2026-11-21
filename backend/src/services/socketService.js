import { Server } from 'socket.io';

class SocketService {
  constructor() {
    this.io = null;
    // In-memory atomic cache for active sprint states and leaderboards
    this.sprintCache = new Map();
  }

  init(httpServer, corsOrigin = 'http://localhost:5173') {
    this.io = new Server(httpServer, {
      cors: {
        origin: corsOrigin,
        methods: ['GET', 'POST'],
        credentials: true
      }
    });

    this.io.on('connection', (socket) => {
      console.log(`⚡ Client connected to real-time socket: ${socket.id}`);

      // Client joins a specific sprint room
      socket.on('join_sprint_room', (sprintId) => {
        if (!sprintId) return;
        socket.join(`sprint:${sprintId}`);
        console.log(`👥 Socket ${socket.id} joined room sprint:${sprintId}`);

        // Emit cached latest leaderboard if present
        if (this.sprintCache.has(sprintId)) {
          socket.emit('sprint_update', this.sprintCache.get(sprintId));
        }
      });

      socket.on('leave_sprint_room', (sprintId) => {
        if (!sprintId) return;
        socket.leave(`sprint:${sprintId}`);
      });

      socket.on('disconnect', () => {
        console.log(`🔌 Client disconnected from socket: ${socket.id}`);
      });
    });

    return this.io;
  }

  // Broadcast updated sprint & leaderboard data to everyone in the room
  broadcastSprintUpdate(sprintId, sprintData) {
    if (!sprintId || !sprintData) return;

    // Cache latest atomic state
    this.sprintCache.set(String(sprintId), sprintData);

    if (this.io) {
      this.io.to(`sprint:${sprintId}`).emit('sprint_update', sprintData);
      this.io.emit('sprints_list_changed');
    }
  }

  // Broadcast a new peer activity notification
  broadcastActivity(sprintId, activity) {
    if (this.io && sprintId) {
      this.io.to(`sprint:${sprintId}`).emit('new_activity', activity);
    }
  }
}

export const socketService = new SocketService();
