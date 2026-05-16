import { Request, Response, NextFunction } from 'express';
import { eventsService } from './events.service';
import { sendSuccess, sendPaginated } from '../../shared/helpers';

export class EventsController {
  async findAll(req: Request, res: Response, next: NextFunction) {
    try {
      const { events, total, page, limit } = await eventsService.findAll(req.query as any);
      sendPaginated(res, events, total, page, limit);
    } catch (error) {
      next(error);
    }
  }

  async findById(req: Request, res: Response, next: NextFunction) {
    try {
      const event = await eventsService.findById(req.params.id);
      sendSuccess(res, event);
    } catch (error) {
      next(error);
    }
  }

  async findBySlug(req: Request, res: Response, next: NextFunction) {
    try {
      const event = await eventsService.findBySlug(req.params.slug);
      sendSuccess(res, event);
    } catch (error) {
      next(error);
    }
  }

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const event = await eventsService.create(
        req.body,
        req.user!.id,
        req.user!.universityId
      );
      sendSuccess(res, event, 201);
    } catch (error) {
      next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const event = await eventsService.update(
        req.params.id,
        req.body,
        req.user!.id,
        req.user!.role
      );
      sendSuccess(res, event);
    } catch (error) {
      next(error);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await eventsService.delete(
        req.params.id,
        req.user!.id,
        req.user!.role
      );
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }

  async getTrending(req: Request, res: Response, next: NextFunction) {
    try {
      const events = await eventsService.getTrending();
      sendSuccess(res, events);
    } catch (error) {
      next(error);
    }
  }

  async getUpcoming(req: Request, res: Response, next: NextFunction) {
    try {
      const events = await eventsService.getUpcoming();
      sendSuccess(res, events);
    } catch (error) {
      next(error);
    }
  }

  async getFeatured(req: Request, res: Response, next: NextFunction) {
    try {
      const events = await eventsService.getFeatured();
      sendSuccess(res, events);
    } catch (error) {
      next(error);
    }
  }

  async getMyEvents(req: Request, res: Response, next: NextFunction) {
    try {
      const { events, total, page, limit } = await eventsService.getByOrganizer(
        req.user!.id,
        req.query as any
      );
      sendPaginated(res, events, total, page, limit);
    } catch (error) {
      next(error);
    }
  }
}

export const eventsController = new EventsController();
