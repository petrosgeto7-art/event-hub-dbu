import { Router } from 'express';
import { Request, Response, NextFunction } from 'express';
import { authenticate } from '../../middleware/auth';
import prisma from '../../shared/prisma';
import { sendSuccess } from '../../shared/helpers';

const router = Router();

// Get certificates for the logged-in student
router.get('/my', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const certificates = await prisma.certificate.findMany({
      where: { userId: req.user!.id },
      include: {
        event: {
          select: { title: true, date: true }
        }
      },
      orderBy: { issuedAt: 'desc' }
    });

    sendSuccess(res, certificates);
  } catch (error) {
    next(error);
  }
});

export default router;
