import { Router } from 'express';
import { registrationsController } from './registrations.controller';
import { authenticate } from '../../middleware/auth';
import { authorize } from '../../middleware/rbac';
import { Role } from '@prisma/client';

const router = Router();

// Student routes
router.post('/events/:eventId/register', authenticate, registrationsController.register);
router.delete('/events/:eventId/register', authenticate, registrationsController.cancel);
router.get('/my/registrations', authenticate, registrationsController.getUserRegistrations);
router.get('/my/registrations/:id', authenticate, registrationsController.getRegistrationById);
router.get('/registrations/:registrationId/qr', authenticate, registrationsController.getQrCode);

// Organizer/Admin routes
router.get(
  '/events/:eventId/registrations',
  authenticate,
  authorize(Role.ADMIN, Role.ORGANIZER, Role.SUPER_ADMIN),
  registrationsController.getEventRegistrations
);

export default router;
