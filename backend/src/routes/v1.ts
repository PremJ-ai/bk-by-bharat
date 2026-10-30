import { Router } from "express";
import { adminAuthRouter } from "../modules/admin-auth/admin-auth.routes.js";
import { publicCatalogRouter, adminCatalogRouter } from "../modules/catalog/catalog.routes.js";
import { adminMediaRouter } from "../modules/media/media.routes.js";
import {
  publicOrdersRouter,
  adminOrdersRouter,
  adminSettingsRouter,
  whatsappRouter,
  maintenanceRouter,
} from "../modules/commerce/commerce.routes.js";
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

// Admin media asset endpoints (/api/v1/admin/media)
v1Router.use("/admin/media", adminMediaRouter);

// Public guest commerce endpoints (/api/v1/orders/checkout, /api/v1/orders/status, etc.)
v1Router.use("/orders", publicOrdersRouter);

// Admin order fulfillment & review endpoints (/api/v1/admin/orders)
v1Router.use("/admin/orders", adminOrdersRouter);

// Admin store & payment settings (/api/v1/admin/settings/payment)
v1Router.use("/admin/settings", adminSettingsRouter);

// WhatsApp webhook and administration (/api/v1/whatsapp)
v1Router.use("/whatsapp", whatsappRouter);

// Protected scheduled maintenance (/api/v1/maintenance)
v1Router.use("/maintenance", maintenanceRouter);
