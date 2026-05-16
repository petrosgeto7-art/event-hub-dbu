import { Request, Response, NextFunction } from 'express';
import prisma from '../../shared/prisma';
import { chapaService } from '../../shared/chapa';
import { sendSuccess } from '../../shared/helpers';

export const paymentsController = {
  /**
   * Verify an Event Registration payment
   * Callback from Chapa
   */
  async verifyRegistrationPayment(req: Request, res: Response, next: NextFunction) {
    try {
      const { tx_ref } = req.params;

      // Check Chapa API
      const isVerified = await chapaService.verify(tx_ref);

      if (!isVerified) {
        return res.status(400).json({ success: false, message: 'Payment verification failed' });
      }

      // Update Registration status
      const registration = await prisma.registration.update({
        where: { txRef: tx_ref },
        data: { paymentStatus: 'PAID', status: 'CONFIRMED' },
      });

      // Update Event Registration Count
      await prisma.event.update({
        where: { id: registration.eventId },
        data: { registeredCount: { increment: 1 } },
      });

      sendSuccess(res, { message: 'Payment successful, registration confirmed' });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Verify Vendor Workspace Payment
   */
  async verifyWorkspacePayment(req: Request, res: Response, next: NextFunction) {
    try {
      const { tx_ref } = req.params;

      const isVerified = await chapaService.verify(tx_ref);

      if (!isVerified) {
        return res.status(400).json({ success: false, message: 'Payment verification failed' });
      }

      const user = await prisma.user.update({
        where: { workspaceTxRef: tx_ref },
        data: { hasPaidWorkspace: true },
      });

      sendSuccess(res, { message: 'Workspace payment verified' });
    } catch (error) {
      next(error);
    }
  }
};
