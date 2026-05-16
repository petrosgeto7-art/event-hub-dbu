import { Router } from 'express';
import { eventsController } from './events.controller';
import { validate } from '../../middleware/validate';
import { authenticate, optionalAuth } from '../../middleware/auth';
import { authorize } from '../../middleware/rbac';
import { createEventSchema, updateEventSchema, eventQuerySchema } from './events.schema';
import { Role } from '@prisma/client';

const router = Router();

// Public routes
router.get('/', optionalAuth, validate(eventQuerySchema, 'query'), eventsController.findAll);
router.get('/trending', eventsController.getTrending);
router.get('/upcoming', eventsController.getUpcoming);
router.get('/featured', eventsController.getFeatured);
router.get('/slug/:slug', eventsController.findBySlug);
router.get('/:id', eventsController.findById);

// Protected routes
router.post('/', authenticate, authorize(Role.ADMIN, Role.ORGANIZER, Role.SUPER_ADMIN), validate(createEventSchema), eventsController.create);
router.put('/:id', authenticate, authorize(Role.ADMIN, Role.ORGANIZER, Role.SUPER_ADMIN), validate(updateEventSchema), eventsController.update);
router.delete('/:id', authenticate, authorize(Role.ADMIN, Role.ORGANIZER, Role.SUPER_ADMIN), eventsController.delete);

// Organizer's events
router.get('/my/events', authenticate, authorize(Role.ADMIN, Role.ORGANIZER, Role.SUPER_ADMIN), eventsController.getMyEvents);

export default router;
