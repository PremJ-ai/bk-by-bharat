import { Router } from "express";
import { adminAuthController } from "./admin-auth.controller.js";
import { loginSchema } from "./admin-auth.schemas.js";
import { validate } from "../../middleware/validate.js";
import { authenticate } from "../../middleware/authenticate.js";
import { csrfProtection } from "../../middleware/csrf.js";
import { loginRateLimiter } from "../../middleware/rate-limit.js";

export const adminAuthRouter = Router();

adminAuthRouter.post(
  "/login",
  loginRateLimiter,
  csrfProtection,
  validate({ body: loginSchema }),
  adminAuthController.login
);

adminAuthRouter.post(
  "/logout",
  authenticate,
  csrfProtection,
  adminAuthController.logout
);

adminAuthRouter.get(
  "/session",
  authenticate,
  adminAuthController.getSession
);
