import type { Request, Response, NextFunction } from "express";
import { adminAuthService, AdminAuthService } from "./admin-auth.service.js";
import { SESSION_COOKIE_NAME, CSRF_COOKIE_NAME, IS_PROD } from "../../config/constants.js";
import { generateCsrfToken, setCsrfCookie } from "../../middleware/csrf.js";
import { UnauthorizedError } from "../../lib/errors.js";

export class AdminAuthController {
  constructor(private service: AdminAuthService = adminAuthService) {}

  login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { username, password } = req.body;
      const ipAddress = req.ip;
      const userAgent = req.headers["user-agent"];

      const result = await this.service.login(
        { username, password },
        { ipAddress, userAgent }
      );

      // Set secure HTTP-only session cookie
      res.cookie(SESSION_COOKIE_NAME, result.sessionToken, {
        httpOnly: true,
        secure: IS_PROD,
        sameSite: "lax",
        path: "/",
        expires: result.expiresAt,
      });

      // Issue fresh CSRF token
      const csrfToken = generateCsrfToken();
      setCsrfCookie(res, csrfToken);

      res.status(200).json({
        data: result.admin,
        meta: {
          requestId: req.id,
          csrfToken,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  logout = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const sessionToken = req.cookies?.[SESSION_COOKIE_NAME];
      if (sessionToken) {
        await this.service.logout(sessionToken, req.adminUser?.id, req.ip);
      }

      // Clear session cookie
      res.clearCookie(SESSION_COOKIE_NAME, {
        httpOnly: true,
        secure: IS_PROD,
        sameSite: "lax",
        path: "/",
      });

      // Clear CSRF cookie
      res.clearCookie(CSRF_COOKIE_NAME, {
        secure: IS_PROD,
        sameSite: "lax",
        path: "/",
      });

      res.status(200).json({
        data: { success: true },
        meta: {
          requestId: req.id,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  getSession = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.adminUser) {
        throw new UnauthorizedError("No active admin session found.");
      }

      // Refresh or provide CSRF token if cookie is missing
      let csrfToken = req.cookies?.[CSRF_COOKIE_NAME];
      if (!csrfToken) {
        csrfToken = generateCsrfToken();
        setCsrfCookie(res, csrfToken);
      }

      res.status(200).json({
        data: this.service.toDTO(req.adminUser),
        meta: {
          requestId: req.id,
          csrfToken,
        },
      });
    } catch (error) {
      next(error);
    }
  };
}

export const adminAuthController = new AdminAuthController();
