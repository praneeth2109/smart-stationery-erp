/**
 * Pagination utilities.
 *
 * All list endpoints accept optional `page` (1-based) and `limit` query params.
 * Default: page=1, limit=50, max limit=200.
 *
 * Response shape:
 *   { data: T[], meta: { page, limit, total, totalPages } }
 */

import { Request } from "express";

export interface PaginationParams {
  page: number;
  limit: number;
  skip: number;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export function parsePagination(req: Request, defaultLimit = 50): PaginationParams {
  const page = Math.max(1, parseInt(String(req.query.page ?? "1"), 10) || 1);
  const rawLimit = parseInt(String(req.query.limit ?? String(defaultLimit)), 10) || defaultLimit;
  const limit = Math.min(200, Math.max(1, rawLimit));
  return { page, limit, skip: (page - 1) * limit };
}

export function buildMeta(total: number, { page, limit }: PaginationParams): PaginationMeta {
  return {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  };
}
