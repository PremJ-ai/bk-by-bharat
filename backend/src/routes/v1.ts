import { Router } from "express";
import { adminAuthRouter } from "../modules/admin-auth/admin-auth.routes.js";
import { publicCatalogRouter, adminCatalogRouter } from "../modules/catalog/catalog.routes.js";
import { checkDatabaseConnection } from "../db/prisma.js";

export const v1Router = Router();

// Liveness check
v1Router.get("/health/live", (_req, res) => {
  res.status(200).json({
    status: "ok",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// Readiness check
v1Router.get("/health/ready", async (_req, res) => {
  const isDbHealthy = await checkDatabaseConnection();
  if (isDbHealthy) {
    res.status(200).json({
      status: "ready",
      database: "connected",
      timestamp: new Date().toISOString(),
    });
  } else {
    res.status(503).json({
      status: "unavailable",
      database: "disconnected",
      timestamp: new Date().toISOString(),
    });
  }
});

// Admin authentication endpoints
v1Router.use("/admin-auth", adminAuthRouter);

// Public storefront catalog endpoints (/api/v1/products, /api/v1/categories)
v1Router.use("/", publicCatalogRouter);

// Admin catalog management endpoints (/api/v1/admin/products)
v1Router.use("/admin/products", adminCatalogRouter);
