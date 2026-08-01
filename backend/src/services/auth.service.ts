import { prisma } from "@/config/prisma";
import { ApiError } from "@/utils/ApiError";
import { comparePassword, hashPassword } from "@/utils/password";
import {
  getRefreshTokenExpiryDate,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from "@/utils/jwt";
import { Role, UserStatus } from "@/types/enums";

interface RegisterInput {
  name: string;
  email: string;
  password: string;
  role: Role;
  phone?: string;
}

interface LoginInput {
  email: string;
  password: string;
  ipAddress?: string;
}

export const authService = {
  async register(input: RegisterInput) {
    const existing = await prisma.user.findUnique({ where: { email: input.email } });
    if (existing) {
      throw ApiError.conflict("A user with this email already exists");
    }

    const passwordHash = await hashPassword(input.password);

    const user = await prisma.user.create({
      data: {
        name: input.name,
        email: input.email,
        passwordHash,
        role: input.role,
        phone: input.phone,
      },
    });

    return sanitizeUser(user);
  },

  async login(input: LoginInput) {
    const user = await prisma.user.findUnique({ where: { email: input.email } });

    if (!user) {
      throw ApiError.unauthorized("Invalid email or password");
    }

    if (user.status === UserStatus.SUSPENDED) {
      throw ApiError.forbidden("This account has been suspended. Contact the shop owner.");
    }

    const isPasswordValid = await comparePassword(input.password, user.passwordHash);

    if (!isPasswordValid) {
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: "LOGIN_FAILED",
          entityType: "User",
          entityId: user.id,
          ipAddress: input.ipAddress,
        },
      });
      throw ApiError.unauthorized("Invalid email or password");
    }

    const accessToken = signAccessToken({ userId: user.id, role: user.role as Role, email: user.email });
    const refreshToken = signRefreshToken(user.id);

    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt: getRefreshTokenExpiryDate(),
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "LOGIN",
        entityType: "User",
        entityId: user.id,
        ipAddress: input.ipAddress,
      },
    });

    return { user: sanitizeUser(user), accessToken, refreshToken };
  },

  async refresh(token: string) {
    let payload: { userId: string };
    try {
      payload = verifyRefreshToken(token);
    } catch {
      throw ApiError.unauthorized("Invalid or expired refresh token");
    }

    const stored = await prisma.refreshToken.findUnique({ where: { token } });
    if (!stored || stored.revoked || stored.expiresAt < new Date()) {
      throw ApiError.unauthorized("Refresh token is no longer valid. Please log in again.");
    }

    const user = await prisma.user.findUnique({ where: { id: payload.userId } });
    if (!user || user.status === UserStatus.SUSPENDED) {
      throw ApiError.unauthorized("Account is not active");
    }

    const accessToken = signAccessToken({ userId: user.id, role: user.role as Role, email: user.email });

    return { accessToken, user: sanitizeUser(user) };
  },

  async logout(token: string, userId?: string) {
    await prisma.refreshToken.updateMany({
      where: { token },
      data: { revoked: true },
    });

    if (userId) {
      await prisma.auditLog.create({
        data: {
          userId,
          action: "LOGOUT",
          entityType: "User",
          entityId: userId,
        },
      });
    }
  },

  async getProfile(userId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw ApiError.notFound("User not found");
    return sanitizeUser(user);
  },
};

function sanitizeUser<T extends { passwordHash: string }>(user: T) {
  const { passwordHash: _passwordHash, ...safeUser } = user;
  return safeUser;
}
