import { Router } from 'express';
import { Request, Response, NextFunction } from 'express';
import prisma from '../../shared/prisma';
import { authenticate } from '../../middleware/auth';
import { sendSuccess } from '../../shared/helpers';

const router = Router();

// Get categories
router.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const categories = await prisma.category.findMany({
      include: { _count: { select: { events: true } } },
      orderBy: { name: 'asc' },
    });
    sendSuccess(res, categories);
  } catch (error) {
    next(error);
  }
});

// Toggle bookmark
router.post(
  '/events/:eventId/bookmark',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const existing = await prisma.bookmark.findUnique({
        where: { userId_eventId: { userId: req.user!.id, eventId: req.params.eventId } },
      });

      if (existing) {
        await prisma.bookmark.delete({ where: { id: existing.id } });
        sendSuccess(res, { bookmarked: false });
      } else {
        await prisma.bookmark.create({
          data: { userId: req.user!.id, eventId: req.params.eventId },
        });
        sendSuccess(res, { bookmarked: true });
      }
    } catch (error) {
      next(error);
    }
  }
);

// Get bookmarks
router.get(
  '/my/bookmarks',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const bookmarks = await prisma.bookmark.findMany({
        where: { userId: req.user!.id },
        include: {
          event: {
            select: {
              id: true, title: true, slug: true, date: true, bannerImage: true,
              location: true, status: true, registeredCount: true, capacity: true,
              category: { select: { name: true, icon: true, color: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
      sendSuccess(res, bookmarks);
    } catch (error) {
      next(error);
    }
  }
);

export default router;
