import { NextFunction, Request, Response } from "express";
import { ApiError } from "@/utils/ApiError";
import { verifyAccessToken } from "@/utils/jwt";
import { Role } from "@/types/enums";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        role: Role;
        email: string;
      };
    }
  }
}

/** Verifies the Bearer access token and attaches the decoded user to req.user */
export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;

  if (!header || !header.startsWith("Bearer ")) {
    return next(ApiError.unauthorized("Missing or malformed Authorization header"));
  }

  const token = header.slice("Bearer ".length);

  try {
    const payload = verifyAccessToken(token);
    req.user = payload;
    next();
  } catch {
    next(ApiError.unauthorized("Invalid or expired access token"));
  }
}

/** Restricts a route to one or more roles. Must be used after requireAuth. */
export function requireRole(...allowedRoles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(ApiError.unauthorized());
    }
    if (!allowedRoles.includes(req.user.role)) {
      return next(ApiError.forbidden("You do not have permission to perform this action"));
    }
    next();
  };
}
