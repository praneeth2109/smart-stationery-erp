import { NextFunction, Request, Response } from "express";
import { ApiError } from "@/utils/ApiError";

export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.originalUrl} not found`,
  });
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      details: err.details,
    });
  }

  console.error("Unhandled error:", err);

  return res.status(500).json({
    success: false,
    message: "An unexpected error occurred",
  });
}
