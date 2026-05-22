import prisma from '../../shared/prisma';
import { BadRequestError, ConflictError, NotFoundError } from '../../shared/errors';
import { v4 as uuidv4 } from 'uuid';
import QRCode from 'qrcode';
import { chapaService } from '../../shared/chapa';
import { env } from '../../config/env';

export class RegistrationsService {
  async register(userId: string, eventId: string) {
    // Check event exists and is open
    const event = await prisma.event.findUnique({ where: { id: eventId } });
    if (!event) throw new NotFoundError('Event');
    if (event.status !== 'PUBLISHED') {
      throw new BadRequestError('Event is not open for registration');
    }
    if (event.registrationDeadline && new Date() > event.registrationDeadline) {
      throw new BadRequestError('Registration deadline has passed');
    }

    // Check if event has already started
    // Build start time in LOCAL timezone (not UTC) by setting hours/minutes directly
    const eventDate = new Date(event.date);
    const startDateTime = new Date(eventDate);
    if (event.startTime && event.startTime.includes(':')) {
      const [h, m] = event.startTime.split(':').map(Number);
      startDateTime.setHours(h, m, 0, 0);
    }
    
    if (new Date() >= startDateTime) {
      throw new BadRequestError('Registration is closed. The event has already started.');
    }

    // Check duplicate
    const existing = await prisma.registration.findFirst({
      where: { userId, eventId, status: { not: 'CANCELLED' } },
    });
    if (existing && existing.status !== 'CANCELLED') {
      if (!event.isFree && existing.paymentStatus === 'PENDING') {
        // User wants to retry a failed/pending payment
      } else {
        throw new ConflictError('Already registered for this event');
      }
    }

    // Check capacity
    const isWaitlisted = event.registeredCount >= event.capacity;

    // Generate QR token
    const qrToken = uuidv4();

    // Generate QR code data URL
    const qrData = JSON.stringify({ token: qrToken, eventId, userId });
    const qrCode = await QRCode.toDataURL(qrData, {
      width: 300,
      margin: 2,
      color: { dark: '#000000', light: '#ffffff' },
    });

    // Create or update registration
    const registration = existing
      ? await prisma.registration.update({
          where: { id: existing.id },
          data: {
            status: isWaitlisted ? 'WAITLISTED' : 'CONFIRMED',
            qrCode,
            qrToken,
            cancelledAt: null,
          },
          include: {
            event: {
              select: { id: true, title: true, date: true, location: true },
            },
          },
        })
      : await prisma.registration.create({
          data: {
            userId,
            eventId,
            status: isWaitlisted ? 'WAITLISTED' : 'CONFIRMED',
            qrCode,
            qrToken,
          },
          include: {
            event: {
              select: { id: true, title: true, date: true, location: true },
            },
          },
        });

    // Handle Payment if event is NOT free
    if (!event.isFree && event.price && event.price > 0) {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      const txRef = `evt_${event.id}_${Date.now()}`;
      
      // Update registration to PENDING payment
      await prisma.registration.update({
        where: { id: registration.id },
        data: { paymentStatus: 'PENDING', txRef },
      });

      // We do NOT increment registeredCount yet for paid events

      // Get vendor (organizer) details for split payment
      const vendor = await prisma.user.findUnique({ where: { id: event.organizerId } });
      
      // Get current commission config
      const commConfig = await prisma.commissionConfig.findUnique({ where: { id: 'default' } });
      const commissionRate = commConfig?.rate || 10.0;

      // Setup subaccount for split payment if vendor has bank details
      let subaccounts: Array<{ id: string }> | undefined;

      if (vendor && vendor.cbeAccount) {
        // Check if vendor already has a Chapa subaccount
        let subaccountId = vendor.chapaSubaccountId;

        if (!subaccountId) {
          // Create a new subaccount for the vendor
          // The split_value is the vendor's share (100 - commission%)
          const vendorSharePercent = 100 - commissionRate;
          subaccountId = await chapaService.createSubaccount({
            business_name: `${vendor.firstName} ${vendor.lastName} - EventHub`,
            account_name: `${vendor.firstName} ${vendor.lastName}`,
            bank_code: '128', // CBE bank code in Chapa
            account_number: vendor.cbeAccount,
            split_type: 'percentage',
            split_value: vendorSharePercent,
          });

          // Save subaccount ID to vendor profile
          if (subaccountId) {
            await prisma.user.update({
              where: { id: vendor.id },
              data: { chapaSubaccountId: subaccountId },
            });
          }
        }

        if (subaccountId) {
          subaccounts = [{ id: subaccountId }];
        }
      }

      // Initialize Chapa Checkout with optional split payment
      const backendUrl = `http://localhost:${process.env.PORT || 4000}`;
      const returnUrl = `${env.FRONTEND_URL}/dashboard/student/payment-verify?tx_ref=${txRef}`;
      const checkoutUrl = await chapaService.initialize({
        amount: event.price,
        email: user?.email || 'student@dbu.edu.et',
        first_name: user?.firstName || 'Student',
        last_name: user?.lastName || 'DBU',
        tx_ref: txRef,
        callback_url: `${backendUrl}/api/payments/verify-registration/${txRef}`,
        return_url: returnUrl,
        customization: {
          title: `Ticket: ${event.title}`,
          description: `Payment for ${event.title} registration`,
        },
        subaccounts,
      });

      // MOCK BYPASS: If the mock bypass returned the return_url directly, process it instantly
      if (checkoutUrl === returnUrl) {
        console.log('Mock bypass: Instantly confirming payment');
        await prisma.registration.update({
          where: { id: registration.id },
          data: { paymentStatus: 'PAID', status: 'CONFIRMED' },
        });
        
        if (!isWaitlisted && !existing) {
          await prisma.event.update({
            where: { id: eventId },
            data: { registeredCount: { increment: 1 } },
          });
        }

        return {
          ...registration,
          requiresPayment: false,
          status: 'CONFIRMED',
          paymentStatus: 'PAID'
        };
      }

      return {
        ...registration,
        requiresPayment: true,
        checkoutUrl
      };
    }

    // Update registered count for FREE events
    if (!isWaitlisted) {
      await prisma.event.update({
        where: { id: eventId },
        data: { registeredCount: { increment: 1 } },
      });
    }

    // Create notification
    await prisma.notification.create({
      data: {
        userId,
        title: isWaitlisted ? 'Added to Waitlist' : 'Registration Confirmed',
        message: `You have been ${isWaitlisted ? 'waitlisted for' : 'registered for'} "${event.title}"`,
        type: 'REGISTRATION_CONFIRMED',
        data: { eventId, registrationId: registration.id },
      },
    });

    return { ...registration, requiresPayment: false };
  }

  async getRefundPreview(userId: string, eventId: string) {
    const registration = await prisma.registration.findFirst({
      where: { userId, eventId, status: { not: 'CANCELLED' } },
      include: { event: true },
    });

    if (!registration) throw new NotFoundError('Registration');

    const ticketPrice = registration.event.price || 0;
    
    if (ticketPrice === 0 || registration.paymentStatus !== 'PAID') {
      return { ticketPrice: 0, refundPercentage: 0, refundAmount: 0 };
    }

    // Default policy: 80% refund (20% cancellation fee)
    const refundPercentage = 80;
    const refundAmount = (ticketPrice * refundPercentage) / 100;

    return { ticketPrice, refundPercentage, refundAmount };
  }

  async cancel(userId: string, eventId: string) {
    const registration = await prisma.registration.findFirst({
      where: { userId, eventId, status: { not: 'CANCELLED' } },
      include: { event: true },
    });

    if (!registration) throw new NotFoundError('Registration');
    if (registration.status === 'CANCELLED') {
      throw new BadRequestError('Registration already cancelled');
    }

    const wasConfirmed = registration.status === 'CONFIRMED';
    const ticketPrice = registration.event.price || 0;
    
    // Calculate refund amount
    let refundAmount = 0;
    if (ticketPrice > 0 && registration.paymentStatus === 'PAID') {
      refundAmount = (ticketPrice * 80) / 100; // 80% refund policy
    }

    await prisma.registration.update({
      where: { id: registration.id },
      data: { 
        status: 'CANCELLED', 
        cancelledAt: new Date(),
        // Only set refundAmount if they actually paid
        ...(refundAmount > 0 ? { refundAmount } : {})
      } as any,
    });

    // Decrement count if was confirmed
    if (wasConfirmed) {
      await prisma.event.update({
        where: { id: eventId },
        data: { registeredCount: { decrement: 1 } },
      });

      // Promote first waitlisted user
      const nextWaitlisted = await prisma.registration.findFirst({
        where: { eventId, status: 'WAITLISTED' },
        orderBy: { registeredAt: 'asc' },
      });

      if (nextWaitlisted) {
        await prisma.registration.update({
          where: { id: nextWaitlisted.id },
          data: { status: 'CONFIRMED' },
        });
        await prisma.event.update({
          where: { id: eventId },
          data: { registeredCount: { increment: 1 } },
        });
      }
    }

    return { message: 'Registration cancelled', refundAmount };
  }

  async getEventRegistrations(eventId: string, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;
    const [registrations, total] = await Promise.all([
      prisma.registration.findMany({
        where: { eventId, status: { not: 'CANCELLED' } },
        include: {
          user: {
            select: {
              id: true, firstName: true, lastName: true, email: true,
              avatar: true, department: true, studentId: true,
            },
          },
          attendance: { select: { checkedInAt: true, method: true } },
        },
        orderBy: { registeredAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.registration.count({ where: { eventId, status: { not: 'CANCELLED' } } }),
    ]);

    return { registrations, total, page, limit };
  }

  async getUserRegistrations(userId: string) {
    return prisma.registration.findMany({
      where: { userId, status: { not: 'CANCELLED' } },
      include: {
        event: {
          select: {
            id: true, title: true, slug: true, date: true, startTime: true,
            endTime: true, location: true, isOnline: true, bannerImage: true,
            status: true, category: { select: { name: true, icon: true, color: true } },
          },
        },
        attendance: { select: { checkedInAt: true } },
      },
      orderBy: { registeredAt: 'desc' },
    });
  }

  async getQrCode(registrationId: string, userId: string) {
    const registration = await prisma.registration.findFirst({
      where: { id: registrationId, userId },
    });

    if (!registration) throw new NotFoundError('Registration');
    return { qrCode: registration.qrCode };
  }
}

export const registrationsService = new RegistrationsService();
