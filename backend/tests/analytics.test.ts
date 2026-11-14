import { afterEach, describe, expect, it, vi } from "vitest";
import { generateKeyPairSync } from "node:crypto";
import { GoogleAnalyticsService } from "../src/modules/analytics/google-analytics.service.js";

const envKeys = [
  "GOOGLE_ANALYTICS_PROPERTY_ID",
  "GOOGLE_SERVICE_ACCOUNT_EMAIL",
  "GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY",
] as const;

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function configureAnalytics(propertyId = "987654321") {
  const { privateKey } = generateKeyPairSync("rsa", {
    modulusLength: 2048,
    privateKeyEncoding: { type: "pkcs8", format: "pem" },
    publicKeyEncoding: { type: "spki", format: "pem" },
  });
  vi.stubEnv("GOOGLE_ANALYTICS_PROPERTY_ID", propertyId);
  vi.stubEnv("GOOGLE_SERVICE_ACCOUNT_EMAIL", `bk-analytics-${propertyId}@bk-test.iam.gserviceaccount.com`);
  // Exercise the escaped-newline format commonly used in Vercel environment values.
  vi.stubEnv("GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY", privateKey.replace(/\n/g, "\\n"));
}

describe("Google Analytics reporting service", () => {
  it("reports missing backend variables without attempting a network request", async () => {
    for (const key of envKeys) vi.stubEnv(key, "");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const result = await new GoogleAnalyticsService().getOverview();

    expect(result.configured).toBe(false);
    expect(result.metrics).toBeNull();
    expect(result.setupRequired).toEqual(expect.arrayContaining([...envKeys]));
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("normalizes a Vercel escaped private key and returns GA4 totals", async () => {
    configureAnalytics();
    const values = ["125", "240", "920", "36", "18", "7", "15340.5"];
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({
        access_token: "test-google-access-token",
        expires_in: 3600,
      }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        currencyCode: "INR",
        totals: [{ metricValues: values.map((value) => ({ value })) }],
      }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await new GoogleAnalyticsService().getOverview();

    expect(result).toMatchObject({
      configured: true,
      propertyId: "987654321",
      currencyCode: "INR",
      metrics: {
        activeUsers: 125,
        sessions: 240,
        pageViews: 920,
        addToCarts: 36,
        checkouts: 18,
        purchases: 7,
        revenue: 15340.5,
      },
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const reportRequest = fetchMock.mock.calls[1][1] as RequestInit;
    const reportBody = JSON.parse(String(reportRequest.body));
    expect(reportBody.metricAggregations).toEqual(["TOTAL"]);
    expect(reportBody.dateRanges).toEqual([{ startDate: "6daysAgo", endDate: "today" }]);
  });

  it("returns actionable Google permission errors without exposing credential values", async () => {
    configureAnalytics("123456789");
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({
        access_token: "test-google-access-token",
        expires_in: 3600,
      }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        error: {
          code: 403,
          status: "PERMISSION_DENIED",
          message: "User does not have sufficient permissions for this property.",
        },
      }), { status: 403 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(new GoogleAnalyticsService().getOverview()).rejects.toThrow(
      /has Viewer access to property 123456789.*PERMISSION_DENIED/i,
    );
  });

  it("identifies an invalid private-key format before calling Google", async () => {
    vi.stubEnv("GOOGLE_ANALYTICS_PROPERTY_ID", "987654321");
    vi.stubEnv("GOOGLE_SERVICE_ACCOUNT_EMAIL", "bk-analytics-test@bk-test.iam.gserviceaccount.com");
    vi.stubEnv("GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY", "not-a-pem-key");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const result = await new GoogleAnalyticsService().getOverview();

    expect(result.configured).toBe(false);
    expect(result.setupRequired).toContain(
      "GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY (invalid PEM format)",
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
