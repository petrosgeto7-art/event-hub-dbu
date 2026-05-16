import { Response } from 'express';

export function sendSuccess(res: Response, data: any, statusCode: number = 200, meta?: any) {
  return res.status(statusCode).json({
    success: true,
    data,
    ...(meta && { meta }),
  });
}

export function sendPaginated(
  res: Response,
  data: any[],
  total: number,
  page: number,
  limit: number
) {
  return res.status(200).json({
    success: true,
    data,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      hasMore: page * limit < total,
    },
  });
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/^-+|-+$/g, '')
    + '-' + Date.now().toString(36);
}

export function parsePagination(query: { page?: string; limit?: string }) {
  const page = Math.max(1, parseInt(query.page || '1', 10));
  const limit = Math.min(50, Math.max(1, parseInt(query.limit || '10', 10)));
  const skip = (page - 1) * limit;
  return { page, limit, skip };
}
