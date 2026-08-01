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
  return jwt.sign({ userId }, env.JWT_REFRESH_SECRET, {
    expiresIn: `${env.JWT_REFRESH_EXPIRES_IN_DAYS}d` as any,
  });
}

export function verifyRefreshToken(token: string): { userId: string } {
  return jwt.verify(token, env.JWT_REFRESH_SECRET) as { userId: string };
}

export function getRefreshTokenExpiryDate(): Date {
  const days = Number(env.JWT_REFRESH_EXPIRES_IN_DAYS);
  const expires = new Date();
  expires.setDate(expires.getDate() + days);
  return expires;
}
