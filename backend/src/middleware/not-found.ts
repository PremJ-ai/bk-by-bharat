import type { Request, Response, NextFunction } from "express";
import { NotFoundError } from "../lib/errors.js";

export function notFoundHandler(req: Request, _res: Response, next: NextFunction): void {
  next(new NotFoundError(`Route not found: ${req.method} ${req.path}`));
}
