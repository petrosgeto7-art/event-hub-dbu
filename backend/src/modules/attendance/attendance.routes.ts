import { Router } from 'express';
import { attendanceController } from './attendance.controller';
import { authenticate } from '../../middleware/auth';
import { authorize } from '../../middleware/rbac';
import { Role } from '@prisma/client';

const router = Router();

router.post(
  '/scan',
  authenticate,
  authorize(Role.ADMIN, Role.ORGANIZER, Role.SUPER_ADMIN),
  attendanceController.scanQr
);

router.get(
  '/events/:eventId',
  authenticate,
  authorize(Role.ADMIN, Role.ORGANIZER, Role.SUPER_ADMIN),
  attendanceController.getEventAttendance
);

export default router;
