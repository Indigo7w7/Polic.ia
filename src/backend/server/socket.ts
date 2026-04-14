import { Server as SocketServer } from 'socket.io';
import { Server as HttpServer } from 'http';

let io: SocketServer | undefined;

export function setupSocket(server: HttpServer) {
  if (io) return io;

  io = new SocketServer(server, {
    cors: {
      origin: [
        'https://polic-ia-7bf7e.web.app',
        'https://polic-ia-7bf7e.firebaseapp.com',
        'http://localhost:5173',
        'http://localhost:3000'
      ],
      methods: ['GET', 'POST']
    }
  });

  io.on('connection', (socket) => {
    console.log(`[WS] New client connected: ${socket.id}`);

    socket.on('join_session', (sessionId: string) => {
      socket.join(`session_${sessionId}`);
      console.log(`[WS] Client ${socket.id} joined session: ${sessionId}`);
    });

    socket.on('new_message', (payload: { sessionId: string; message: any }) => {
      // Broadcast to others in the same session
      socket.to(`session_${payload.sessionId}`).emit('session_update', payload.message);
      console.log(`[WS] Message in session ${payload.sessionId}`);
    });

    socket.on('disconnect', () => {
      console.log(`[WS] Client disconnected: ${socket.id}`);
    });
  });

  return io;
}
