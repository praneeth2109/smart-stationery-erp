import { NextFunction, Request, Response } from "express";
import { ApiError } from "@/utils/ApiError";

export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.originalUrl} not found`,
  });
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: any, req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      details: err.details,
    });
  }

  console.error("Unhandled error details:", err);

  const message = err?.message || "An unexpected error occurred";
  const statusCode = typeof err?.statusCode === "number" ? err.statusCode : 500;

  return res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV !== "production" && { stack: err?.stack }),
  });
}
