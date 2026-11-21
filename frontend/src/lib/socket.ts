import { io, Socket } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:8000';

class SocketClient {
  private socket: Socket | null = null;

  connect(): Socket {
    if (!this.socket) {
      this.socket = io(SOCKET_URL, {
        transports: ['websocket', 'polling'],
        withCredentials: true
      });

      this.socket.on('connect', () => {
        console.log('⚡ Connected to Student Finance WebSocket server');
      });

      this.socket.on('disconnect', () => {
        console.log('🔌 Disconnected from WebSocket server');
      });
    }
    return this.socket;
  }

  joinSprint(sprintId: string) {
    if (this.socket && sprintId) {
      this.socket.emit('join_sprint_room', sprintId);
    }
  }

  leaveSprint(sprintId: string) {
    if (this.socket && sprintId) {
      this.socket.emit('leave_sprint_room', sprintId);
    }
  }

  onSprintUpdate(callback: (data: any) => void) {
    if (this.socket) {
      this.socket.on('sprint_update', callback);
    }
  }

  onNewActivity(callback: (activity: any) => void) {
    if (this.socket) {
      this.socket.on('new_activity', callback);
    }
  }

  onSprintsListChanged(callback: () => void) {
    if (this.socket) {
      this.socket.on('sprints_list_changed', callback);
    }
  }

  removeListeners() {
    if (this.socket) {
      this.socket.off('sprint_update');
      this.socket.off('new_activity');
      this.socket.off('sprints_list_changed');
    }
  }
}

export const socketClient = new SocketClient();
