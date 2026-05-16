import { Router } from 'express';
import { Request, Response, NextFunction } from 'express';
import prisma from '../../shared/prisma';
import { authenticate } from '../../middleware/auth';
import { authorize } from '../../middleware/rbac';
import { sendSuccess } from '../../shared/helpers';
import { Role } from '@prisma/client';

const router = Router();

// Public platform stats for landing page
router.get(
  '/public-stats',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const [
        totalStudents,
        totalOrganizers,
        totalEvents,
        avgFeedback,
      ] = await Promise.all([
        prisma.user.count({ where: { role: 'STUDENT' } }),
        prisma.user.count({ where: { role: 'ORGANIZER' } }),
        prisma.event.count({ where: { status: { in: ['PUBLISHED', 'COMPLETED', 'ONGOING'] } } }),
        prisma.feedback.aggregate({ _avg: { rating: true } }),
      ]);

      const satisfaction = avgFeedback._avg.rating 
        ? Math.round((avgFeedback._avg.rating / 5) * 100) 
        : 98; // Default to 98% if no feedback exists yet

      sendSuccess(res, {
        students: totalStudents > 1000 ? `${Math.floor(totalStudents/1000)}K+` : `${totalStudents}+`,
        events: `${totalEvents}+`,
        organizers: `${totalOrganizers}+`,
        satisfaction: `${satisfaction}%`,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Platform overview stats
router.get(
  '/overview',
  authenticate,
  authorize(Role.ADMIN, Role.SUPER_ADMIN),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const [
        totalUsers,
        totalEvents,
        totalRegistrations,
        totalAttendance,
        activeEvents,
        recentUsers,
      ] = await Promise.all([
        prisma.user.count(),
        prisma.event.count(),
        prisma.registration.count({ where: { status: 'CONFIRMED' } }),
        prisma.attendance.count(),
        prisma.event.count({ where: { status: 'PUBLISHED', date: { gte: new Date() } } }),
        prisma.user.count({ where: { createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } } }),
      ]);

      const attendanceRate = totalRegistrations > 0
        ? Math.round((totalAttendance / totalRegistrations) * 100)
        : 0;

      sendSuccess(res, {
        totalUsers,
        totalEvents,
        totalRegistrations,
        totalAttendance,
        activeEvents,
        recentUsers,
        attendanceRate,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Event analytics
router.get(
  '/events',
  authenticate,
  authorize(Role.ADMIN, Role.ORGANIZER, Role.SUPER_ADMIN),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Events by status
      const eventsByStatus = await prisma.event.groupBy({
        by: ['status'],
        _count: { status: true },
      });

      // Events by category
      const eventsByCategory = await prisma.event.groupBy({
        by: ['categoryId'],
        _count: { categoryId: true },
        _sum: { registeredCount: true },
      });

      // Monthly events (last 12 months)
      const twelveMonthsAgo = new Date();
      twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

      const monthlyEvents = await prisma.event.findMany({
        where: { createdAt: { gte: twelveMonthsAgo } },
        select: { createdAt: true },
      });

      const monthlyData = Array.from({ length: 12 }, (_, i) => {
        const d = new Date();
        d.setMonth(d.getMonth() - (11 - i));
        const month = d.toLocaleString('default', { month: 'short', year: 'numeric' });
        const count = monthlyEvents.filter((e) => {
          const eDate = new Date(e.createdAt);
          return eDate.getMonth() === d.getMonth() && eDate.getFullYear() === d.getFullYear();
        }).length;
        return { month, count };
      });

      // Top events by registration
      const topEvents = await prisma.event.findMany({
        select: { id: true, title: true, registeredCount: true, viewCount: true },
        orderBy: { registeredCount: 'desc' },
        take: 10,
      });

      sendSuccess(res, {
        eventsByStatus: eventsByStatus.map((s) => ({ status: s.status, count: s._count.status })),
        monthlyTrend: monthlyData,
        topEvents,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Attendance analytics
router.get(
  '/attendance',
  authenticate,
  authorize(Role.ADMIN, Role.ORGANIZER, Role.SUPER_ADMIN),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      const attendanceRecords = await prisma.attendance.findMany({
        where: { checkedInAt: { gte: sixMonthsAgo } },
        select: { checkedInAt: true },
      });

      const monthlyAttendance = Array.from({ length: 6 }, (_, i) => {
        const d = new Date();
        d.setMonth(d.getMonth() - (5 - i));
        const month = d.toLocaleString('default', { month: 'short' });
        const count = attendanceRecords.filter((a) => {
          const aDate = new Date(a.checkedInAt);
          return aDate.getMonth() === d.getMonth() && aDate.getFullYear() === d.getFullYear();
        }).length;
        return { month, count };
      });

      // Attendance by department
      const byDepartment = await prisma.attendance.findMany({
        include: { user: { select: { department: true } } },
        take: 1000,
      });

      const departmentMap = new Map<string, number>();
      byDepartment.forEach((a) => {
        const dept = a.user.department || 'Unknown';
        departmentMap.set(dept, (departmentMap.get(dept) || 0) + 1);
      });

      sendSuccess(res, {
        monthlyTrend: monthlyAttendance,
        byDepartment: Array.from(departmentMap.entries()).map(([dept, count]) => ({
          department: dept,
          count,
        })),
      });
    } catch (error) {
      next(error);
    }
  }
);

// Student engagement metrics
router.get(
  '/engagement',
  authenticate,
  authorize(Role.ADMIN, Role.SUPER_ADMIN),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const [avgFeedback, topStudents, activeStudents] = await Promise.all([
        prisma.feedback.aggregate({ _avg: { rating: true }, _count: { rating: true } }),
        prisma.user.findMany({
          where: { role: 'STUDENT' },
          select: {
            id: true, firstName: true, lastName: true, streakCount: true,
            _count: { select: { attendance: true, certificates: true } },
          },
          orderBy: { streakCount: 'desc' },
          take: 10,
        }),
        prisma.user.count({
          where: {
            role: 'STUDENT',
            lastLoginAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
          },
        }),
      ]);

      sendSuccess(res, {
        averageSatisfaction: avgFeedback._avg.rating ? Math.round(avgFeedback._avg.rating * 10) / 10 : 0,
        totalFeedbackCount: avgFeedback._count.rating,
        topStudents,
        weeklyActiveStudents: activeStudents,
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
