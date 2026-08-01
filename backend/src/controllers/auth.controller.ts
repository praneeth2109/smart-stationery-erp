import { Request, Response } from "express";
import { asyncHandler } from "@/utils/asyncHandler";
import { authService } from "@/services/auth.service";
import { ApiError } from "@/utils/ApiError";
import { env } from "@/config/env";

/** Name used for the HttpOnly refresh-token cookie */
const REFRESH_COOKIE = "rt";

/** Cookie options shared across set/clear calls */
const refreshCookieOptions = {
  httpOnly: true,
  secure: env.NODE_ENV === "production",
  sameSite: "strict" as const,
  // 7-day TTL matches the default JWT_REFRESH_EXPIRES_IN_DAYS
  maxAge: Number(env.JWT_REFRESH_EXPIRES_IN_DAYS) * 24 * 60 * 60 * 1000,
  path: "/api/auth",
};

export const authController = {
  register: asyncHandler(async (req: Request, res: Response) => {
    const user = await authService.register(req.body);
    res.status(201).json({ success: true, data: user });
  }),

  login: asyncHandler(async (req: Request, res: Response) => {
    const result = await authService.login({
      ...req.body,
      ipAddress: req.ip,
    });

    // Store refresh token in HttpOnly cookie — never exposed to JS
    res.cookie(REFRESH_COOKIE, result.refreshToken, refreshCookieOptions);

    // Still include the refreshToken in the body for clients that can't use cookies
    // (e.g. mobile apps / Postman). Clients should prefer the cookie.
    res.status(200).json({ success: true, data: result });
  }),

  refresh: asyncHandler(async (req: Request, res: Response) => {
    // Accept token from HttpOnly cookie first, fall back to request body
    const token: string | undefined =
      req.cookies?.[REFRESH_COOKIE] ?? req.body?.refreshToken;

    if (!token) throw ApiError.badRequest("Refresh token is required");

    const result = await authService.refresh(token);

    // Rotate the cookie with the same token (refresh token is NOT rotated here,
    // only the access token is issued fresh — matching current service behaviour)
    res.cookie(REFRESH_COOKIE, token, refreshCookieOptions);

    res.status(200).json({ success: true, data: result });
  }),

  logout: asyncHandler(async (req: Request, res: Response) => {
    // Accept token from cookie first, fall back to body
    const token: string | undefined =
      req.cookies?.[REFRESH_COOKIE] ?? req.body?.refreshToken;

    if (!token) throw ApiError.badRequest("refreshToken is required");

    await authService.logout(token, req.user?.userId);

    // Clear the HttpOnly cookie
    res.clearCookie(REFRESH_COOKIE, { ...refreshCookieOptions, maxAge: 0 });

    res.status(200).json({ success: true, message: "Logged out successfully" });
  }),

  me: asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw ApiError.unauthorized();
    const user = await authService.getProfile(req.user.userId);
    res.status(200).json({ success: true, data: user });
  }),
};
