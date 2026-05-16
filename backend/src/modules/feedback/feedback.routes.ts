import { Router } from 'express';
import { Request, Response, NextFunction } from 'express';
import prisma from '../../shared/prisma';
import { authenticate } from '../../middleware/auth';
import { authorize } from '../../middleware/rbac';
import { sendSuccess, sendPaginated, parsePagination } from '../../shared/helpers';
import { BadRequestError, NotFoundError } from '../../shared/errors';
import { Role } from '@prisma/client';
import { z } from 'zod';
import { validate } from '../../middleware/validate';

const router = Router();

const feedbackSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(1000).optional(),
});

// Submit feedback
router.post(
  '/events/:eventId/feedback',
  authenticate,
  validate(feedbackSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Check if user attended the event
      const attendance = await prisma.attendance.findUnique({
        where: { userId_eventId: { userId: req.user!.id, eventId: req.params.eventId } },
      });

      if (!attendance) {
        throw new BadRequestError('You must attend the event to give feedback');
      }

      const feedback = await prisma.feedback.upsert({
        where: { userId_eventId: { userId: req.user!.id, eventId: req.params.eventId } },
        update: { rating: req.body.rating, comment: req.body.comment },
        create: {
          userId: req.user!.id,
          eventId: req.params.eventId,
          rating: req.body.rating,
          comment: req.body.comment,
        },
      });

      sendSuccess(res, feedback);
    } catch (error) {
      next(error);
    }
  }
);

// Get event feedback
router.get(
  '/events/:eventId/feedback',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { page, limit, skip } = parsePagination(req.query as any);

      const [feedback, total, stats] = await Promise.all([
        prisma.feedback.findMany({
          where: { eventId: req.params.eventId },
          include: {
            user: { select: { id: true, firstName: true, lastName: true, avatar: true } },
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
        }),
        prisma.feedback.count({ where: { eventId: req.params.eventId } }),
        prisma.feedback.aggregate({
          where: { eventId: req.params.eventId },
          _avg: { rating: true },
          _count: { rating: true },
        }),
      ]);

      sendPaginated(res, feedback, total, page, limit);
    } catch (error) {
      next(error);
    }
  }
);

// Get event feedback stats
router.get(
  '/events/:eventId/feedback/stats',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const stats = await prisma.feedback.aggregate({
        where: { eventId: req.params.eventId },
        _avg: { rating: true },
        _count: { rating: true },
        _min: { rating: true },
        _max: { rating: true },
      });

      // Rating distribution
      const distribution = await prisma.feedback.groupBy({
        by: ['rating'],
        where: { eventId: req.params.eventId },
        _count: { rating: true },
      });

      sendSuccess(res, {
        averageRating: stats._avg.rating ? Math.round(stats._avg.rating * 10) / 10 : 0,
        totalReviews: stats._count.rating,
        distribution: distribution.map((d) => ({
          rating: d.rating,
          count: d._count.rating,
        })),
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
