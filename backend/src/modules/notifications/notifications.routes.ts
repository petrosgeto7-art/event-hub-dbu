import { Router } from 'express';
import { Request, Response, NextFunction } from 'express';
import prisma from '../../shared/prisma';
import { authenticate } from '../../middleware/auth';
import { sendSuccess, parsePagination } from '../../shared/helpers';

const router = Router();

// Get user notifications
router.get(
  '/',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { page, limit, skip } = parsePagination(req.query as any);

      const [notifications, total, unreadCount] = await Promise.all([
        prisma.notification.findMany({
          where: { userId: req.user!.id },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
        }),
        prisma.notification.count({ where: { userId: req.user!.id } }),
        prisma.notification.count({ where: { userId: req.user!.id, isRead: false } }),
      ]);

      sendSuccess(res, { notifications, total, unreadCount, page, limit });
    } catch (error) {
      next(error);
    }
  }
);

// Mark notification as read
router.patch(
  '/:id/read',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await prisma.notification.update({
        where: { id: req.params.id, userId: req.user!.id },
        data: { isRead: true },
      });
      sendSuccess(res, { message: 'Marked as read' });
    } catch (error) {
      next(error);
    }
  }
);

// Mark all as read
router.patch(
  '/read-all',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await prisma.notification.updateMany({
        where: { userId: req.user!.id, isRead: false },
        data: { isRead: true },
      });
      sendSuccess(res, { message: 'All notifications marked as read' });
    } catch (error) {
      next(error);
    }
  }
);

// Get unread count
router.get(
  '/unread-count',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const count = await prisma.notification.count({
        where: { userId: req.user!.id, isRead: false },
      });
      sendSuccess(res, { count });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
