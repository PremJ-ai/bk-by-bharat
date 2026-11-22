import { createHash, createSign } from "node:crypto";

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const REPORT_URL = "https://analyticsdata.googleapis.com/v1beta/properties";
const GA_READONLY_SCOPE = "https://www.googleapis.com/auth/analytics.readonly";
const CACHE_TTL_MS = 5 * 60 * 1000;

type CachedToken = {
  accessToken: string;
  expiresAt: number;
};

const tokenCache = new Map<string, CachedToken>();
const reportCache = new Map<string, { value: GA4Overview; expiresAt: number }>();

export interface GA4Overview {
  configured: boolean;
  propertyId?: string;
  currencyCode?: string;
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

function normalizePrivateKey(value: string | undefined): string | undefined {
  if (!value) return undefined;
  return value
    .trim()
    .replace(/^["']|["']$/g, "")
    .replace(/\\r\\n/g, "\n")
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "\n")
    .replace(/\r\n/g, "\n")
    .trim();
}

function safeGoogleError(payload: unknown): string | undefined {
  if (!payload || typeof payload !== "object") return undefined;
  const error = (payload as { error?: { message?: unknown; status?: unknown } }).error;
  if (!error || typeof error !== "object") return undefined;
  const message = typeof error.message === "string" ? error.message : undefined;
  const status = typeof error.status === "string" ? error.status : undefined;
  return [status, message].filter(Boolean).join(": ").slice(0, 500) || undefined;
}

export class GoogleAnalyticsService {
  private getConfiguration() {
    const propertyId = process.env.GOOGLE_ANALYTICS_PROPERTY_ID?.trim();
    const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL?.trim();
    const privateKey = normalizePrivateKey(process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY);

    const missing: string[] = [];
    if (!propertyId) missing.push("GOOGLE_ANALYTICS_PROPERTY_ID");
    if (!clientEmail) missing.push("GOOGLE_SERVICE_ACCOUNT_EMAIL");
    if (!privateKey) missing.push("GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY");

    if (propertyId && !/^\d+$/.test(propertyId)) {
      missing.push("GOOGLE_ANALYTICS_PROPERTY_ID (must be the numeric GA4 property ID)");
    }
    if (clientEmail && !/^[^\s@]+@[^\s@]+\.iam\.gserviceaccount\.com$/i.test(clientEmail)) {
      missing.push("GOOGLE_SERVICE_ACCOUNT_EMAIL (must be a service-account email)");
    }
    if (privateKey && (!privateKey.includes("-----BEGIN PRIVATE KEY-----") || !privateKey.includes("-----END PRIVATE KEY-----"))) {
      missing.push("GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY (invalid PEM format)");
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

    const cacheKey = createHash("sha256")
      .update(`${config.propertyId}: ${config.clientEmail}`)
      .digest("hex");
    const cachedReport = reportCache.get(cacheKey);
    if (cachedReport && cachedReport.expiresAt > Date.now()) {
      return cachedReport.value;
    }

    const accessToken = await this.getAccessToken(
      config.clientEmail!,
      config.privateKey!,
    );
    const response = await fetch(
      `${REPORT_URL}/${config.propertyId}:runReport`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          dateRanges: [{ startDate: "6daysAgo", endDate: "today" }],
          metricAggregations: ["TOTAL"],
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
      },
    );

    const reportPayload = await response.json().catch(() => null);
    if (!response.ok) {
      const googleMessage = safeGoogleError(reportPayload);
      if (response.status === 403) {
        throw new Error(
          `Google Analytics access denied. Confirm Analytics Data API is enabled and ${config.clientEmail} has Viewer access to property ${config.propertyId}.${googleMessage ? ` Google: ${googleMessage}` : ""}`,
        );
      }
      throw new Error(
        `Google Analytics Data API returned HTTP ${response.status}.${googleMessage ? ` Google: ${googleMessage}` : ""}`,
      );
    }

    const report = reportPayload as {
      rows?: Array<{ metricValues?: Array<{ value?: string }> }>;
      totals?: Array<{ metricValues?: Array<{ value?: string }> }>;
      currencyCode?: string;
    } | null;
    if (!report) {
      throw new Error("Google Analytics returned an empty report response.");
    }

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
      currencyCode: report.currencyCode || "INR",
      period: "last_7_days",
      updatedAt: new Date().toISOString(),
      metrics,
    };

    reportCache.set(cacheKey, { value: result, expiresAt: Date.now() + CACHE_TTL_MS });
    return result;
  }

  private async getAccessToken(clientEmail: string, privateKey: string): Promise<string> {
    const cacheKey = createHash("sha256").update(clientEmail).digest("hex");
    const cached = tokenCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now() + 60_000) {
      return cached.accessToken;
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
      }),
    );
    const unsignedAssertion = `${header}.${claim}`;
    const signer = createSign("RSA-SHA256");
    signer.update(unsignedAssertion);
    signer.end();

    let signature: string;
    try {
      signature = signer.sign(privateKey, "base64url");
    } catch {
      throw new Error(
        "Google service-account private key could not be parsed. Re-copy the complete private_key value from the service-account JSON into the backend environment, preserving PEM line breaks.",
      );
    }
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
    const tokenPayload = await response.json().catch(() => null);
    if (!response.ok) {
      const googleMessage = safeGoogleError(tokenPayload);
      throw new Error(
        `Google service-account authentication failed (HTTP ${response.status}). Check that the key is active and belongs to ${clientEmail}.${googleMessage ? ` Google: ${googleMessage}` : ""}`,
      );
    }

    const tokenResponse = tokenPayload as {
      access_token?: string;
      expires_in?: number;
    } | null;
    if (!tokenResponse?.access_token) {
      throw new Error("Google did not return an Analytics access token.");
    }

    tokenCache.set(cacheKey, {
      accessToken: tokenResponse.access_token,
      expiresAt: Date.now() + (tokenResponse.expires_in || 3600) * 1000,
    });

    return tokenResponse.access_token;
  }
}
