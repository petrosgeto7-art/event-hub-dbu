import PDFDocument from 'pdfkit';
import path from 'path';
import fs from 'fs';
import prisma from '../../shared/prisma';
import { v4 as uuidv4 } from 'uuid';
import logger from '../../shared/logger';
import { env } from '../../config/env';

export class CertificatesService {
  /**
   * Generates a single PDF certificate for a specific user and event
   */
  async generatePdf(certificate: any): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        // Create document in landscape orientation
        const doc = new PDFDocument({
          size: 'A4',
          layout: 'landscape',
          margin: 50,
        });

        const buffers: Buffer[] = [];
        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => resolve(Buffer.concat(buffers)));
        doc.on('error', reject);

        const width = doc.page.width;
        const height = doc.page.height;

        // Background / Border
        doc.rect(20, 20, width - 40, height - 40).lineWidth(2).stroke('#1e3a8a'); // border
        doc.rect(25, 25, width - 50, height - 50).lineWidth(1).stroke('#3b82f6'); // inner border
        
        // Very faint background color
        doc.rect(30, 30, width - 60, height - 60).fillColor('#f8fafc').fill();

        // Title
        doc.fillColor('#1e3a8a')
           .font('Helvetica-Bold')
           .fontSize(40)
           .text('CERTIFICATE', 0, 100, { align: 'center' });

        doc.fillColor('#64748b')
           .font('Helvetica')
           .fontSize(16)
           .text('OF PARTICIPATION', 0, 150, { align: 'center', characterSpacing: 5 });

        // Presentation text
        doc.fillColor('#334155')
           .font('Helvetica')
           .fontSize(14)
           .text('This is proudly presented to', 0, 220, { align: 'center' });

        // User Name
        doc.fillColor('#0f172a')
           .font('Helvetica-Bold')
           .fontSize(32)
           .text(`${certificate.user.firstName} ${certificate.user.lastName}`, 0, 260, { align: 'center' });

        // Event Text
        doc.fillColor('#334155')
           .font('Helvetica')
           .fontSize(14)
           .text('for successfully attending and participating in', 0, 320, { align: 'center' });

        // Event Name
        doc.fillColor('#1e3a8a')
           .font('Helvetica-Bold')
           .fontSize(24)
           .text(certificate.event.title, 0, 360, { align: 'center' });

        // Event Date
        const eventDate = new Date(certificate.event.date).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
        doc.fillColor('#64748b')
           .font('Helvetica')
           .fontSize(12)
           .text(`held on ${eventDate}`, 0, 400, { align: 'center' });

        // Footer lines & Signatures
        doc.lineWidth(1).strokeColor('#cbd5e1');
        
        // Left signature line
        doc.moveTo(150, 480).lineTo(300, 480).stroke();
        doc.fillColor('#0f172a').font('Helvetica').fontSize(12)
           .text('Event Organizer', 150, 490, { width: 150, align: 'center' });

        // Right signature line
        doc.moveTo(width - 300, 480).lineTo(width - 150, 480).stroke();
        doc.fillColor('#0f172a').font('Helvetica').fontSize(12)
           .text('EventHub DBU', width - 300, 490, { width: 150, align: 'center' });

        // Verification Code
        doc.fillColor('#94a3b8')
           .font('Helvetica')
           .fontSize(8)
           .text(`Verification Code: ${certificate.verificationCode}`, 40, height - 40, { align: 'left' });
        
        // Date issued
        const issuedAt = new Date(certificate.issuedAt).toLocaleDateString('en-US');
        doc.text(`Issued: ${issuedAt}`, 0, height - 40, { align: 'right', width: width - 40 });

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Automatically generate certificates for an event that has ended.
   */
  async generateForEvent(eventId: string) {
    const event = await prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) return;

    // Find all attendees
    const attendees = await prisma.attendance.findMany({
      where: { eventId },
      include: {
        user: true,
      }
    });

    if (attendees.length === 0) return;

    let generatedCount = 0;

    for (const attendance of attendees) {
      // Check if certificate already exists
      const existing = await prisma.certificate.findUnique({
        where: {
          userId_eventId: {
            userId: attendance.userId,
            eventId: eventId,
          }
        }
      });

      if (!existing) {
        // Create new certificate record
        const verificationCode = uuidv4().split('-')[0].toUpperCase() + '-' + Date.now().toString(36).toUpperCase();
        
        await prisma.certificate.create({
          data: {
            userId: attendance.userId,
            eventId: eventId,
            verificationCode,
          }
        });

        // Notify user
        await prisma.notification.create({
          data: {
            userId: attendance.userId,
            title: 'Certificate Ready!',
            message: `Your certificate for "${event.title}" is ready to view and download.`,
            type: 'CERTIFICATE_READY',
            data: { eventId },
          }
        });

        generatedCount++;
      }
    }

    logger.info(`Generated ${generatedCount} certificates for event ${eventId}`);
    return { generatedCount, eventId };
  }
}

export const certificatesService = new CertificatesService();
