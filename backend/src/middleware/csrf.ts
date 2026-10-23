import type { Request, Response, NextFunction } from "express";
import crypto from "node:crypto";
import { env } from "../config/env.js";
import { CSRF_COOKIE_NAME, CSRF_HEADER_NAME, IS_PROD } from "../config/constants.js";
import { ForbiddenError } from "../lib/errors.js";

/**
 * Generate a new random CSRF token
 */
export function generateCsrfToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * Set the CSRF token cookie on response
 */
export function setCsrfCookie(res: Response, token: string): void {
  res.cookie(CSRF_COOKIE_NAME, token, {
    httpOnly: false, // Must be readable by client JS to send back in X-CSRF-Token header
    secure: IS_PROD,
    sameSite: "lax",
    path: "/",
  });
}

/**
 * Verify CSRF on state-changing requests
 */
export function csrfProtection(req: Request, _res: Response, next: NextFunction): void {
  // Safe HTTP methods do not change state
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) {
    return next();
  }

  // 1. Verify Origin / Referer against configured frontend origin
  const origin = req.headers.origin || req.headers.referer;
  if (origin) {
    try {
      const originUrl = new URL(origin);
      const allowedUrl = new URL(env.FRONTEND_ORIGIN);
      if (originUrl.host !== allowedUrl.host) {
        return next(new ForbiddenError("CSRF check failed: untrusted origin."));
      }
    } catch {
      return next(new ForbiddenError("CSRF check failed: malformed origin."));
    }
  }

  // 2. For mutating requests that use session authentication, verify CSRF token
  // If no session cookie is present (e.g. login endpoint), double submit token is optional or checked if provided
  const sessionCookieName = IS_PROD ? "__Host-store_session" : "store_session";
  const hasSession = Boolean(req.cookies?.[sessionCookieName]);

  if (hasSession) {
    const cookieToken = req.cookies?.[CSRF_COOKIE_NAME];
    const headerToken = req.headers[CSRF_HEADER_NAME] as string | undefined;

    if (!cookieToken || !headerToken) {
      return next(new ForbiddenError("CSRF check failed: missing CSRF token."));
    }

    try {
      const match = crypto.timingSafeEqual(Buffer.from(cookieToken), Buffer.from(headerToken));
      if (!match) {
        return next(new ForbiddenError("CSRF check failed: token mismatch."));
      }
    } catch {
      return next(new ForbiddenError("CSRF check failed: invalid token length."));
    }
  }

  next();
}
