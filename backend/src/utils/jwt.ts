import jwt from "jsonwebtoken";
import { env } from "@/config/env";
import { Role } from "@/types/enums";

export interface AccessTokenPayload {
  userId: string;
  role: Role;
  email: string;
}

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRES_IN as any,
  });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessTokenPayload;
}

export function signRefreshToken(userId: string): string {
  const daysStr = String(env.JWT_REFRESH_EXPIRES_IN_DAYS ?? "7").replace(/d$/i, "");
  const days = parseInt(daysStr, 10) || 7;
  return jwt.sign({ userId }, env.JWT_REFRESH_SECRET, {
    expiresIn: `${days}d` as any,
  });
}

export function verifyRefreshToken(token: string): { userId: string } {
  return jwt.verify(token, env.JWT_REFRESH_SECRET) as { userId: string };
}

export function getRefreshTokenExpiryDate(): Date {
  const daysStr = String(env.JWT_REFRESH_EXPIRES_IN_DAYS ?? "7").replace(/d$/i, "");
  const days = parseInt(daysStr, 10) || 7;
  const expires = new Date();
  expires.setDate(expires.getDate() + days);
  return expires;
}
