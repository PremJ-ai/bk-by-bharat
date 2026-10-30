import express, { type Application } from "express";
import type { RequestHandler } from "express";
import { createRequire } from "node:module";
import path from "node:path";
import cors from "cors";
import cookieParser from "cookie-parser";
import { env } from "./config/env.js";
import { requestIdMiddleware } from "./middleware/request-id.js";
import { apiRateLimiter } from "./middleware/rate-limit.js";
import { notFoundHandler } from "./middleware/not-found.js";
import { errorHandler } from "./middleware/error-handler.js";
import { v1Router } from "./routes/v1.js";
import { checkDatabaseConnection } from "./db/prisma.js";

const require = createRequire(import.meta.url);
const helmet = require("helmet") as () => RequestHandler;

export function createApp(): Application {
  const app = express();

  // Trust proxy if configured
  if (env.TRUST_PROXY) {
    app.set("trust proxy", 1);
  }

  // Security headers
  app.use(helmet());

  // CORS configuration
  app.use(
    cors({
      origin:
        env.NODE_ENV === "production"
          ? [env.FRONTEND_ORIGIN]
          : [
              env.FRONTEND_ORIGIN,
              "http://localhost:3000",
              "http://127.0.0.1:3000",
            ],
      credentials: true,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: [
        "Content-Type",
        "Authorization",
        "X-Request-Id",
        "X-CSRF-Token",
      ],
    }),
  );

  // Request correlation ID
  app.use(requestIdMiddleware);

  // Body parsing with strict size limits and rawBody capture for webhooks
  app.use(
    express.json({
      limit: "1mb",
      verify: (req: any, _res, buf) => {
        req.rawBody = buf;
      },
    }),
  );
  app.use(express.urlencoded({ extended: true, limit: "1mb" }));

  // Cookie parsing
  app.use(cookieParser());

  // Root health endpoints for container orchestrators
  app.get("/health/live", (_req, res) => {
    res
      .status(200)
      .json({
        status: "ok",
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
      });
  });

  app.get("/health/ready", async (_req, res) => {
    const isDbHealthy = await checkDatabaseConnection();
    if (isDbHealthy) {
      res
        .status(200)
        .json({
          status: "ready",
          database: "connected",
          timestamp: new Date().toISOString(),
        });
    } else {
      res
        .status(503)
        .json({
          status: "unavailable",
          database: "disconnected",
          timestamp: new Date().toISOString(),
        });
    }
  });

  // Reject direct public static access to sensitive payment proof documents
  app.use("/uploads/proofs", (_req, res) => {
    res.status(403).json({
      error: {
        code: "FORBIDDEN",
        message:
          "Direct static access to payment proof files is prohibited. Protected retrieval required.",
      },
    });
  });

  // Vercel Functions do not persist or serve writable application files.
  if (process.env.VERCEL !== "1") {
    app.use("/uploads", express.static(path.resolve(process.cwd(), "uploads")));
  }

  // API v1 routes with rate limiting
  app.use("/api/v1", apiRateLimiter, v1Router);

  // 404 handler
  app.use(notFoundHandler);

  // Centralized error handler
  app.use(errorHandler);

  return app;
}

const app = createApp();

export default app;
