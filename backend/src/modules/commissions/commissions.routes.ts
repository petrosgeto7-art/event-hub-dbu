import { Router, Request, Response, NextFunction } from 'express';
import prisma from '../../shared/prisma';
import { authenticate } from '../../middleware/auth';
import { authorize } from '../../middleware/rbac';
import { sendSuccess } from '../../shared/helpers';
import { Role } from '@prisma/client';

const router = Router();

// ==========================================
// ADMIN ROUTES
// ==========================================

/**
 * Get current platform commission config
 */
router.get(
  '/config',
  authenticate,
  authorize(Role.SUPER_ADMIN, Role.ADMIN),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      let config = await prisma.commissionConfig.findUnique({
        where: { id: 'default' },
      });

      if (!config) {
        config = await prisma.commissionConfig.create({
          data: { id: 'default', rate: 10.0 },
        });
      }

      sendSuccess(res, { config });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Update platform commission rate
 */
router.put(
  '/config',
  authenticate,
  authorize(Role.SUPER_ADMIN, Role.ADMIN),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { rate } = req.body;
      if (typeof rate !== 'number' || rate < 0 || rate > 100) {
        return res.status(400).json({ success: false, message: 'Invalid rate. Must be between 0 and 100.' });
      }

      const config = await prisma.commissionConfig.upsert({
        where: { id: 'default' },
        update: { rate },
        create: { id: 'default', rate },
      });

      sendSuccess(res, { config, message: 'Commission rate updated successfully' });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Get overall platform earnings (Admin view)
 */
router.get(
  '/earnings',
  authenticate,
  authorize(Role.SUPER_ADMIN, Role.ADMIN),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await prisma.commission.aggregate({
        _sum: {
          totalAmount: true,
          adminAmount: true,
          vendorAmount: true,
        },
      });

      // Get breakdown by vendor (top earners)
      const vendorBreakdown = await prisma.commission.groupBy({
        by: ['vendorId'],
        _sum: {
          adminAmount: true,
          vendorAmount: true,
          totalAmount: true,
        },
        orderBy: {
          _sum: {
            adminAmount: 'desc'
          }
        },
        take: 10,
      });

      // Fetch vendor details
      const vendorIds = vendorBreakdown.map(v => v.vendorId);
      const vendors = await prisma.user.findMany({
        where: { id: { in: vendorIds } },
        select: { id: true, firstName: true, lastName: true, email: true }
      });

      const breakdownWithNames = vendorBreakdown.map(v => ({
        ...v,
        vendor: vendors.find(user => user.id === v.vendorId)
      }));

      sendSuccess(res, {
        totals: {
          totalVolume: result._sum.totalAmount || 0,
          platformRevenue: result._sum.adminAmount || 0,
          vendorPayouts: result._sum.vendorAmount || 0,
        },
        vendorBreakdown: breakdownWithNames
      });
    } catch (error) {
      next(error);
    }
  }
);

// ==========================================
// VENDOR/ORGANIZER ROUTES
// ==========================================

/**
 * Get vendor's own earnings
 */
router.get(
  '/my-earnings',
  authenticate,
  authorize(Role.ORGANIZER, Role.SUPER_ADMIN, Role.ADMIN),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const vendorId = req.user!.id;

      const result = await prisma.commission.aggregate({
        where: { vendorId },
        _sum: {
          totalAmount: true,
          adminAmount: true,
          vendorAmount: true,
        },
      });

      const recentTransactions = await prisma.commission.findMany({
        where: { vendorId },
        include: {
          event: { select: { title: true } },
          registration: { select: { status: true, txRef: true } }
        },
        orderBy: { createdAt: 'desc' },
        take: 20
      });

      sendSuccess(res, {
        totals: {
          grossSales: result._sum.totalAmount || 0,
          platformFees: result._sum.adminAmount || 0,
          netEarnings: result._sum.vendorAmount || 0,
        },
        recentTransactions
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
