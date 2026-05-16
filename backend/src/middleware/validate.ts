import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';
import { BadRequestError } from '../shared/errors';

/**
 * Validate request body, query, or params against a Zod schema.
 */
export function validate(schema: ZodSchema, source: 'body' | 'query' | 'params' = 'body') {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req[source]);

    if (!result.success) {
      const errors = result.error.errors.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      }));

      return next(new BadRequestError(
        `Validation failed: ${errors.map(e => `${e.field}: ${e.message}`).join(', ')}`
      ));
    }

    req[source] = result.data;
    next();
  };
}
