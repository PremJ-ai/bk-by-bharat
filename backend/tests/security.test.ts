import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { prisma } from "../src/db/prisma.js";
import { adminAuthService } from "../src/modules/admin-auth/admin-auth.service.js";
import { SESSION_COOKIE_NAME, CSRF_COOKIE_NAME, CSRF_HEADER_NAME } from "../src/config/constants.js";

const app = createApp();

describe("Security Controls: CSRF & Rate Limiting", () => {
  const username = "sec_admin@store.local";
  const password = "SecPassword123!";
  let sessionCookie: string;
  let csrfCookie: string;
  let validCsrfToken: string;

  beforeAll(async () => {
    await prisma.adminSession.deleteMany({});
    await prisma.adminUser.deleteMany({});
    await adminAuthService.bootstrapFirstAdmin(username, password);

    // Login to get session and csrf tokens
    const loginRes = await request(app)
      .post("/api/v1/admin-auth/login")
      .send({ username, password });

    validCsrfToken = loginRes.body.meta.csrfToken;
    const cookies = loginRes.headers["set-cookie"] as string[];
    sessionCookie = cookies.find((c) => c.startsWith(`${SESSION_COOKIE_NAME}=`))!.split(";")[0];
    csrfCookie = cookies.find((c) => c.startsWith(`${CSRF_COOKIE_NAME}=`))!.split(";")[0];
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("blocks mutating request when CSRF token header is missing on authenticated session", async () => {
    const res = await request(app)
      .post("/api/v1/admin-auth/logout")
      .set("Cookie", [sessionCookie, csrfCookie]);
      // Note: X-CSRF-Token is omitted!

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("FORBIDDEN");
    expect(res.body.error.message).toMatch(/CSRF check failed/i);
  });

  it("blocks mutating request when CSRF token does not match cookie", async () => {
    const res = await request(app)
      .post("/api/v1/admin-auth/logout")
      .set("Cookie", [sessionCookie, csrfCookie])
      .set(CSRF_HEADER_NAME, "mismatched_wrong_token_value_here_12345678901234567890");

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("FORBIDDEN");
  });

  it("blocks request with untrusted cross-site Origin", async () => {
    const res = await request(app)
      .post("/api/v1/admin-auth/logout")
      .set("Origin", "http://malicious-attacker.com")
      .set("Cookie", [sessionCookie, csrfCookie])
      .set(CSRF_HEADER_NAME, validCsrfToken);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("FORBIDDEN");
    expect(res.body.error.message).toMatch(/untrusted origin/i);
  });

  it("enforces login rate limiting after repeated failures", async () => {
    // Send 6 rapid login requests
    const attempts = [];
    for (let i = 0; i < 6; i++) {
      attempts.push(
        request(app)
          .post("/api/v1/admin-auth/login")
          .send({ username, password: "BadPassword123!" })
      );
    }
    const results = await Promise.all(attempts);
    const hasRateLimited = results.some((r) => r.status === 429);
    expect(hasRateLimited).toBe(true);

    const rateLimitedRes = results.find((r) => r.status === 429);
    expect(rateLimitedRes?.body.error.code).toBe("RATE_LIMIT_EXCEEDED");
  });
});
