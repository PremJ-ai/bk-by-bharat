import { rateLimit } from "express-rate-limit";
import {
  RATE_LIMIT_LOGIN_WINDOW_MS,
  RATE_LIMIT_LOGIN_MAX,
  RATE_LIMIT_API_WINDOW_MS,
  RATE_LIMIT_API_MAX,
} from "../config/constants.js";
import { RateLimitError } from "../lib/errors.js";

export const loginRateLimiter = rateLimit({
  windowMs: RATE_LIMIT_LOGIN_WINDOW_MS,
  max: RATE_LIMIT_LOGIN_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, _res, next) => {
    next(new RateLimitError("Too many login attempts. Please try again in 15 minutes."));
  },
});

export const apiRateLimiter = rateLimit({
  windowMs: RATE_LIMIT_API_WINDOW_MS,
  max: RATE_LIMIT_API_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, _res, next) => {
    next(new RateLimitError("Too many API requests. Please slow down."));
  },
});
