import type { Request, Response, NextFunction } from "express";
import crypto from "node:crypto";
import { prisma } from "../db/prisma.js";
import { SESSION_COOKIE_NAME } from "../config/constants.js";
import { UnauthorizedError } from "../lib/errors.js";
import type { AdminUser, AdminSession } from "@prisma/client";

declare global {
  namespace Express {
    interface Request {
      adminUser?: AdminUser;
      adminSession?: AdminSession;
    }
  }
}

export function hashSessionToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function authenticate(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const rawToken = req.cookies?.[SESSION_COOKIE_NAME];

    if (!rawToken || typeof rawToken !== "string") {
      throw new UnauthorizedError("Session cookie missing or invalid.");
    }

    const sessionTokenHash = hashSessionToken(rawToken);

    const session = await prisma.adminSession.findUnique({
      where: { sessionTokenHash },
      include: { adminUser: true },
    });

    if (!session) {
      throw new UnauthorizedError("Session not found.");
    }

    if (session.revokedAt !== null) {
      throw new UnauthorizedError("Session has been revoked.");
    }

    if (session.expiresAt < new Date()) {
      throw new UnauthorizedError("Session has expired.");
    }

    if (session.adminUser.status !== "ACTIVE") {
      throw new UnauthorizedError("Admin account is not active.");
    }

    req.adminUser = session.adminUser;
    req.adminSession = session;
    next();
  } catch (error) {
    next(error);
  }
}
