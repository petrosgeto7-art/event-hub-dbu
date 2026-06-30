import cron from 'node-cron';
import prisma from '../shared/prisma';
import logger from '../shared/logger';
import { certificatesService } from '../modules/certificates/certificates.service';

/**
 * Auto-generate certificates for completed events
 * Runs every 30 minutes
 */
export function startAutoCertificateCron() {
  logger.info('🕒 Starting auto-certificate cron job (runs every 30 mins)');

  cron.schedule('*/30 * * * *', async () => {
    logger.info('🔄 Running auto-certificate job...');
    
    try {
      const now = new Date();

      // Find events that have ended but are not marked COMPLETED
      // Also grab those where eventDate + endTime has passed
      const events = await prisma.event.findMany({
        where: {
          status: { in: ['PUBLISHED', 'ONGOING'] },
        },
      });

      for (const event of events) {
        const eventDate = new Date(event.date);
        
        // Parse endTime (e.g. "16:00")
        const [endHour, endMinute] = event.endTime.split(':').map(Number);
        const eventEndTime = new Date(eventDate);
        eventEndTime.setHours(endHour, endMinute, 0, 0);

        // If the event has ended
        if (now > eventEndTime) {
          logger.info(`Event ${event.id} ("${event.title}") has ended. Generating certificates...`);
          
          await certificatesService.generateForEvent(event.id);

          // Update event status to COMPLETED
          await prisma.event.update({
            where: { id: event.id },
            data: { status: 'COMPLETED' },
          });
        }
      }
    } catch (error) {
      logger.error('Error in auto-certificate cron:', error);
    }
  });
}
