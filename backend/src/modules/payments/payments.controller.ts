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

      const isVerified = await chapaService.verify(tx_ref as string);

      if (!isVerified) {
        return res.status(400).json({ success: false, message: 'Payment verification failed' });
      }

      // Get current commission rate
      const config = await prisma.commissionConfig.findUnique({ where: { id: 'default' } });
      const rate = config ? config.rate : 10.0;

      // Update Registration status and fetch event details
      const registration = await prisma.registration.update({
        where: { txRef: tx_ref as string },
        data: { paymentStatus: 'PAID', status: 'CONFIRMED' },
        include: { event: true },
      });

      // Calculate commissions
      const price = registration.event!.price || 0;
      const adminAmount = price * (rate / 100);
      const vendorAmount = price - adminAmount;

      // Record commission
      await prisma.commission.create({
        data: {
          registrationId: registration.id,
          eventId: registration.eventId,
          vendorId: registration.event!.organizerId,
          totalAmount: price,
          commissionRate: rate,
          adminAmount,
          vendorAmount,
        }
      });

      // Update Registration with commission details
      await prisma.registration.update({
        where: { id: registration.id },
        data: {
          commissionRate: rate,
          adminAmount,
          vendorAmount,
        }
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

      const isVerified = await chapaService.verify(tx_ref as string);

      if (!isVerified) {
        return res.status(400).json({ success: false, message: 'Payment verification failed' });
      }

      const user = await prisma.user.update({
        where: { workspaceTxRef: tx_ref as string },
        data: { hasPaidWorkspace: true },
      });

      sendSuccess(res, { message: 'Workspace payment verified' });
    } catch (error) {
      next(error);
    }
  }
};
