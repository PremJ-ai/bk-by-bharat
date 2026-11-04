import { Router, type Request, type Response } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import { authorize } from "../../middleware/authorize.js";
import { GoogleAnalyticsService } from "./google-analytics.service.js";

export const adminAnalyticsRouter = Router();
const analyticsService = new GoogleAnalyticsService();

adminAnalyticsRouter.use(authenticate, authorize(["ADMIN"]));

adminAnalyticsRouter.get(
  "/overview",
  async (req: Request, res: Response) => {
    try {
      const overview = await analyticsService.getOverview();
      res.status(200).json({
        data: overview,
        meta: { requestId: req.requestId },
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Google Analytics reporting is temporarily unavailable.";

      res.status(502).json({
        error: {
          code: "GA4_REPORT_UNAVAILABLE",
          message,
        },
        meta: { requestId: req.requestId },
      });
    }
  }
);
