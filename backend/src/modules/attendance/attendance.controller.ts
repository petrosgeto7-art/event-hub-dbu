import { Request, Response, NextFunction } from 'express';
import { attendanceService } from './attendance.service';
import { sendSuccess } from '../../shared/helpers';

export class AttendanceController {
  async scanQr(req: Request, res: Response, next: NextFunction) {
    try {
      const { qrToken } = req.body;
      const result = await attendanceService.scanQr(qrToken, req.user!.id);
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }

  async getEventAttendance(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await attendanceService.getEventAttendance(req.params.eventId);
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }
}

export const attendanceController = new AttendanceController();
