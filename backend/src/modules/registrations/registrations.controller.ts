import { Request, Response, NextFunction } from 'express';
import { registrationsService } from './registrations.service';
import { sendSuccess, sendPaginated } from '../../shared/helpers';

export class RegistrationsController {
  async register(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await registrationsService.register(req.user!.id, req.params.eventId);
      sendSuccess(res, result, 201);
    } catch (error) {
      next(error);
    }
  }

  async cancel(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await registrationsService.cancel(req.user!.id, req.params.eventId);
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }

  async getEventRegistrations(req: Request, res: Response, next: NextFunction) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const { registrations, total } = await registrationsService.getEventRegistrations(
        req.params.eventId, page, limit
      );
      sendPaginated(res, registrations, total, page, limit);
    } catch (error) {
      next(error);
    }
  }

  async getUserRegistrations(req: Request, res: Response, next: NextFunction) {
    try {
      const registrations = await registrationsService.getUserRegistrations(req.user!.id);
      sendSuccess(res, registrations);
    } catch (error) {
      next(error);
    }
  }

  async getRegistrationById(req: Request, res: Response, next: NextFunction) {
    try {
      const registration = await registrationsService.getRegistrationById(req.params.id, req.user!.id);
      sendSuccess(res, registration);
    } catch (error) {
      next(error);
    }
  }

  async getQrCode(req: Request, res: Response, next: NextFunction) {
    try {
      const qr = await registrationsService.getQrCode(req.params.registrationId, req.user!.id);
      sendSuccess(res, qr);
    } catch (error) {
      next(error);
    }
  }
}

export const registrationsController = new RegistrationsController();
