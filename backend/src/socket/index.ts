import { Server as SocketServer } from 'socket.io';
import { Server as HttpServer } from 'http';
import logger from '../shared/logger';

export function initializeSocket(httpServer: HttpServer) {
  const io = new SocketServer(httpServer, {
    cors: {
      origin: true,
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  io.on('connection', (socket) => {
    logger.info(`Socket connected: ${socket.id}`);

    // Join user-specific room for notifications
    socket.on('join-user', (userId: string) => {
      socket.join(`user:${userId}`);
      logger.debug(`User ${userId} joined notification room`);
    });

    // Join event room for live updates
    socket.on('join-event', (eventId: string) => {
      socket.join(`event:${eventId}`);
      logger.debug(`Socket ${socket.id} joined event room ${eventId}`);
    });

    socket.on('leave-event', (eventId: string) => {
      socket.leave(`event:${eventId}`);
    });

    socket.on('disconnect', () => {
      logger.debug(`Socket disconnected: ${socket.id}`);
    });
  });

  return io;
}
