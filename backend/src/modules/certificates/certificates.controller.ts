import { Request, Response, NextFunction } from 'express';
import { certificatesService } from './certificates.service';
import { sendSuccess } from '../../shared/helpers';
import prisma from '../../shared/prisma';
import { NotFoundError } from '../../shared/errors';

export class CertificatesController {
  async generateCertificates(req: Request, res: Response, next: NextFunction) {
    try {
      const { eventId } = req.params;
      const result = await certificatesService.generateForEvent(eventId);
      sendSuccess(res, result, 201);
    } catch (error) {
      next(error);
    }
  }

  async downloadCertificate(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      
      const certificate = await prisma.certificate.findUnique({
        where: { id },
        include: {
          user: true,
          event: true,
        }
      });

      if (!certificate) throw new NotFoundError('Certificate');

      // Verify the user requesting it is the owner or an admin
      if (req.user!.id !== certificate.userId && req.user!.role !== 'ADMIN' && req.user!.role !== 'SUPER_ADMIN') {
        throw new NotFoundError('Certificate');
      }

      // Generate the PDF buffer
      const pdfBuffer = await certificatesService.generatePdf(certificate);

      // Set headers for file download
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="Certificate-${certificate.event.slug || 'EventHub'}.pdf"`
      );
      
      // Send the buffer
      res.send(pdfBuffer);
    } catch (error) {
      next(error);
    }
  }
}

export const certificatesController = new CertificatesController();
