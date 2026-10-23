import type { Request, Response, NextFunction } from "express";
import { AppError } from "../lib/errors.js";
import { logger } from "../lib/logger.js";
import { IS_PROD } from "../config/constants.js";

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  const requestId = req.id;

  if (err instanceof AppError) {
    if (err.statusCode >= 500) {
      logger.error({ err, requestId, path: req.path }, "Operational server error");
    } else {
      logger.warn({ err: err.message, code: err.code, requestId, path: req.path }, "Client error");
    }

    res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
        fields: err.fields,
        requestId,
      },
    });
    return;
  }

  // Unexpected / unhandled errors
  logger.error({ err, requestId, path: req.path }, "Unhandled internal error");

  res.status(500).json({
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message: IS_PROD ? "An unexpected error occurred. Please try again later." : err.message,
      requestId,
    },
  });
}
