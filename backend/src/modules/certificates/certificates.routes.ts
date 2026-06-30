import { Router } from 'express';
import { Request, Response, NextFunction } from 'express';
import { authenticate } from '../../middleware/auth';
import prisma from '../../shared/prisma';
import { sendSuccess } from '../../shared/helpers';

import { certificatesController } from './certificates.controller';
import { authorize } from '../../middleware/rbac';
import { Role } from '@prisma/client';

const router = Router();

// Generate certificates for an event (Organizer/Admin)
router.post('/generate/:eventId', 
  authenticate, 
  authorize(Role.ADMIN, Role.ORGANIZER, Role.SUPER_ADMIN), 
  certificatesController.generateCertificates
);

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

// Download a specific certificate PDF
router.get('/:id/download', authenticate, certificatesController.downloadCertificate);

export default router;
