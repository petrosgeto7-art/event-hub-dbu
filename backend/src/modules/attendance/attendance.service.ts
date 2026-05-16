import prisma from '../../shared/prisma';
import { BadRequestError, NotFoundError } from '../../shared/errors';

export class AttendanceService {
  async scanQr(qrToken: string, scannerId: string) {
    // Find registration by QR token
    const registration = await prisma.registration.findUnique({
      where: { qrToken },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
        event: { select: { id: true, title: true, date: true, organizerId: true } },
        attendance: true,
      },
    });

    if (!registration) {
      throw new NotFoundError('Invalid QR code');
    }

    if (registration.status !== 'CONFIRMED') {
      throw new BadRequestError('Registration is not confirmed');
    }

    // Check expiry
    if (registration.qrExpiry && new Date() > registration.qrExpiry) {
      throw new BadRequestError('QR code has expired');
    }

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
