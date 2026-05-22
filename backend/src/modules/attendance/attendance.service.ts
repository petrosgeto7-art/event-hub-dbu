import prisma from '../../shared/prisma';
import { BadRequestError, NotFoundError } from '../../shared/errors';

export class AttendanceService {
  async scanQr(qrToken: string, scannerId: string, currentEventId?: string) {
    // Find registration by QR token
    const registration = await prisma.registration.findUnique({
      where: { qrToken },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
        event: { select: { id: true, title: true, date: true, startTime: true, endTime: true, organizerId: true } },
        attendance: true,
      },
    });

    if (!registration) {
      throw new NotFoundError('Invalid QR code');
    }

    if (registration.status !== 'CONFIRMED') {
      throw new BadRequestError('Registration is not confirmed');
    }

    // 1. Event Matching Validation
    if (currentEventId && registration.eventId !== currentEventId) {
      throw new BadRequestError('This ticket is for a different event!');
    }

    // 2. Date & Time Validation — use LOCAL timezone (not UTC)
    const eventDate = new Date(registration.event.date);
    const today = new Date();
    
    // Build start and end times in local timezone by setting hours/minutes directly
    const startDateTime = new Date(eventDate);
    if (registration.event.startTime && registration.event.startTime.includes(':')) {
      const [h, m] = registration.event.startTime.split(':').map(Number);
      startDateTime.setHours(h, m, 0, 0);
    }
    
    const endDateTime = new Date(eventDate);
    if (registration.event.endTime && registration.event.endTime.includes(':')) {
      const [h, m] = registration.event.endTime.split(':').map(Number);
      endDateTime.setHours(h, m, 0, 0);
    } else {
      endDateTime.setHours(23, 59, 59, 999);
    }
    
    // Open scanner 15 minutes before start
    const scanOpenTime = new Date(startDateTime.getTime() - 15 * 60000);

    if (today > endDateTime) {
      throw new BadRequestError('This event has already ended.');
    }
    
    if (today < scanOpenTime) {
      throw new BadRequestError('Ticket scanning opens 15 minutes before the event starts.');
    }

    // QR codes are valid as long as the event hasn't already been attended

    // Check if already attended
    if (registration.attendance) {
      throw new BadRequestError('Attendance already recorded');
    }

    // Mark attendance
    const attendance = await prisma.attendance.create({
      data: {
        registrationId: registration.id,
        userId: registration.userId,
        eventId: registration.eventId,
        method: 'QR_SCAN',
      },
      include: {
        user: { select: { id: true, firstName: true, lastName: true } },
        event: { select: { id: true, title: true } },
      },
    });

    // Update user streak
    await prisma.user.update({
      where: { id: registration.userId },
      data: { streakCount: { increment: 1 } },
    });

    // Create notification
    await prisma.notification.create({
      data: {
        userId: registration.userId,
        title: 'Attendance Marked',
        message: `Your attendance for "${registration.event.title}" has been recorded.`,
        type: 'ATTENDANCE_MARKED',
        data: { eventId: registration.eventId },
      },
    });

    return attendance;
  }

  async getEventAttendance(eventId: string) {
    const attendance = await prisma.attendance.findMany({
      where: { eventId },
      include: {
        user: {
          select: {
            id: true, firstName: true, lastName: true, email: true,
            avatar: true, department: true, studentId: true,
          },
        },
      },
      orderBy: { checkedInAt: 'desc' },
    });

    const total = await prisma.registration.count({
      where: { eventId, status: 'CONFIRMED' },
    });

    return {
      attendance,
      stats: {
        totalRegistered: total,
        totalAttended: attendance.length,
        attendanceRate: total > 0 ? Math.round((attendance.length / total) * 100) : 0,
      },
    };
  }
}

export const attendanceService = new AttendanceService();
