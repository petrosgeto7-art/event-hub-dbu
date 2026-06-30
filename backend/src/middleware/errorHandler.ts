import { Request, Response, NextFunction } from 'express';
import { AppError } from '../shared/errors';
import logger from '../shared/logger';

export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) {
    logger.warn(`[${req.method}] ${req.path} → ${err.statusCode}: ${err.message}`);
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      code: (err as any).code,
      extra: (err as any).extra,
    });
  }

  // Prisma errors
  if (err.name === 'PrismaClientKnownRequestError') {
    const prismaErr = err as any;
    if (prismaErr.code === 'P2002') {
      logger.warn(`Unique constraint violation: ${prismaErr.meta?.target}`);
      return res.status(409).json({
        success: false,
        message: `A record with this ${prismaErr.meta?.target?.join(', ') || 'value'} already exists.`,
      });
    }
    if (prismaErr.code === 'P2025') {
      return res.status(404).json({
        success: false,
        message: 'Record not found.',
      });
    }
  }

  // Unexpected errors
  logger.error(`Unhandled error: ${err.message}`, { stack: err.stack });
  return res.status(500).json({
    success: false,
    message: process.env.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : err.message,
  });
}
