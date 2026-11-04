import { createSign } from "node:crypto";

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const REPORT_URL = "https://analyticsdata.googleapis.com/v1beta/properties";
const GA_READONLY_SCOPE = "https://www.googleapis.com/auth/analytics.readonly";
const CACHE_TTL_MS = 5 * 60 * 1000;

type CachedToken = {
  accessToken: string;
  expiresAt: number;
};

let tokenCache: CachedToken | null = null;
let reportCache: { value: GA4Overview; expiresAt: number } | null = null;

export interface GA4Overview {
  configured: boolean;
  propertyId?: string;
  period: "last_7_days";
  updatedAt?: string;
  metrics: {
    activeUsers: number;
    sessions: number;
    pageViews: number;
    addToCarts: number;
    checkouts: number;
    purchases: number;
    revenue: number;
  } | null;
  setupRequired?: string[];
}

function base64Url(value: string): string {
  return Buffer.from(value).toString("base64url");
}

function numericMetric(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export class GoogleAnalyticsService {
  private getConfiguration() {
    const propertyId = process.env.GOOGLE_ANALYTICS_PROPERTY_ID?.trim();
    const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL?.trim();
    const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, "\n");

    const missing: string[] = [];
    if (!propertyId) missing.push("GOOGLE_ANALYTICS_PROPERTY_ID");
    if (!clientEmail) missing.push("GOOGLE_SERVICE_ACCOUNT_EMAIL");
    if (!privateKey) missing.push("GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY");

    if (propertyId && !/^\d+$/.test(propertyId)) {
      missing.push("GOOGLE_ANALYTICS_PROPERTY_ID (must be the numeric GA4 property ID)");
    }

    return { propertyId, clientEmail, privateKey, missing };
  }

  async getOverview(): Promise<GA4Overview> {
    const config = this.getConfiguration();
    if (config.missing.length > 0) {
      return {
        configured: false,
        period: "last_7_days",
        metrics: null,
        setupRequired: config.missing,
      };
    }

    if (reportCache && reportCache.expiresAt > Date.now()) {
      return reportCache.value;
    }

    const accessToken = await this.getAccessToken(config.clientEmail!, config.privateKey!);
    const response = await fetch(
      `${REPORT_URL}/${config.propertyId}:runReport`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          dateRanges: [{ startDate: "7daysAgo", endDate: "today" }],
          metrics: [
            { name: "activeUsers" },
            { name: "sessions" },
            { name: "screenPageViews" },
            { name: "addToCarts" },
            { name: "checkouts" },
            { name: "ecommercePurchases" },
            { name: "purchaseRevenue" },
          ],
        }),
        signal: AbortSignal.timeout(12000),
      }
    );

    if (!response.ok) {
      // Do not expose Google's response body or credentials in API errors.
      throw new Error(
        response.status === 403
          ? "Google Analytics access is denied. Confirm that the Data API is enabled and the service account has Viewer access to this GA4 property."
          : `Google Analytics Data API request failed (HTTP ${response.status}).`
      );
    }

    const report = (await response.json()) as {
      rows?: Array<{ metricValues?: Array<{ value?: string }> }>;
      totals?: Array<{ metricValues?: Array<{ value?: string }> }>;
    };

    const metricValues =
      report.totals?.[0]?.metricValues ||
      report.rows?.[0]?.metricValues ||
      [];
    const metrics = {
      activeUsers: numericMetric(metricValues[0]?.value),
      sessions: numericMetric(metricValues[1]?.value),
      pageViews: numericMetric(metricValues[2]?.value),
      addToCarts: numericMetric(metricValues[3]?.value),
      checkouts: numericMetric(metricValues[4]?.value),
      purchases: numericMetric(metricValues[5]?.value),
      revenue: numericMetric(metricValues[6]?.value),
    };

    const result: GA4Overview = {
      configured: true,
      propertyId: config.propertyId,
      period: "last_7_days",
      updatedAt: new Date().toISOString(),
      metrics,
    };

    reportCache = { value: result, expiresAt: Date.now() + CACHE_TTL_MS };
    return result;
  }

  private async getAccessToken(clientEmail: string, privateKey: string): Promise<string> {
    if (tokenCache && tokenCache.expiresAt > Date.now() + 60_000) {
      return tokenCache.accessToken;
    }

    const nowSeconds = Math.floor(Date.now() / 1000);
    const header = base64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
    const claim = base64Url(
      JSON.stringify({
        iss: clientEmail,
        scope: GA_READONLY_SCOPE,
        aud: TOKEN_URL,
        iat: nowSeconds,
        exp: nowSeconds + 3600,
      })
    );
    const unsignedAssertion = `${header}.${claim}`;
    const signer = createSign("RSA-SHA256");
    signer.update(unsignedAssertion);
    signer.end();
    const signature = signer.sign(privateKey, "base64url");
    const assertion = `${unsignedAssertion}.${signature}`;

    const body = new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    });

    const response = await fetch(TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      throw new Error("Google service-account authentication failed. Check the server-side service-account credentials.");
    }

    const tokenResponse = (await response.json()) as {
      access_token?: string;
      expires_in?: number;
    };

    if (!tokenResponse.access_token) {
      throw new Error("Google did not return an Analytics access token.");
    }

    tokenCache = {
      accessToken: tokenResponse.access_token,
      expiresAt: Date.now() + (tokenResponse.expires_in || 3600) * 1000,
    };

    return tokenCache.accessToken;
  }
}
