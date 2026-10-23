import type { Request, Response, NextFunction } from "express";
import { ForbiddenError, UnauthorizedError } from "../lib/errors.js";
import type { AdminRole } from "@prisma/client";

export function authorize(allowedRoles: AdminRole[] = ["ADMIN"]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.adminUser) {
      return next(new UnauthorizedError("Authentication required."));
    }

    if (!allowedRoles.includes(req.adminUser.role)) {
      return next(new ForbiddenError("Insufficient permissions for this operation."));
    }

    next();
  };
}
