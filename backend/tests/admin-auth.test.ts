import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { prisma } from "../src/db/prisma.js";
import { adminAuthService } from "../src/modules/admin-auth/admin-auth.service.js";
import { adminAuthRepository } from "../src/modules/admin-auth/admin-auth.repository.js";
import { loginSchema } from "../src/modules/admin-auth/admin-auth.schemas.js";
import { SESSION_COOKIE_NAME, CSRF_COOKIE_NAME, CSRF_HEADER_NAME } from "../src/config/constants.js";

const app = createApp();

describe("Admin Authentication & Session Lifecycle", () => {
  const testUsername = "admin_test@fashion.local";
  const testPassword = "SuperSecurePassword123!";

  beforeAll(async () => {
    // Clean up test data if any
    await prisma.adminSession.deleteMany({});
    await prisma.adminUser.deleteMany({});
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("bootstraps the first administrator", async () => {
    const admin = await adminAuthService.bootstrapFirstAdmin(testUsername, testPassword);
    expect(admin.id).toBeDefined();
    expect(admin.username).toBe(testUsername.toLowerCase());
    expect(admin.role).toBe("ADMIN");
    expect(admin.status).toBe("ACTIVE");
  });

  it("refuses to bootstrap a second administrator", async () => {
    await expect(
      adminAuthService.bootstrapFirstAdmin("second_admin@store.local", "AnotherPassword123!")
    ).rejects.toThrow(/already exists/i);
  });

  it("rejects login with invalid credentials", async () => {
    const res = await request(app)
      .post("/api/v1/admin-auth/login")
      .send({
        username: testUsername,
        password: "WrongPassword999!",
      });

    expect(res.status).toBe(401);
    expect(res.body.error).toBeDefined();
    expect(res.body.error.code).toBe("UNAUTHORIZED");
    expect(res.body.error.message).toBe("Invalid username or password.");
  });

  it("rejects login for unknown user with generic error", async () => {
    const res = await request(app)
      .post("/api/v1/admin-auth/login")
      .send({
        username: "nonexistent@store.local",
        password: "WrongPassword999!",
      });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHORIZED");
    expect(res.body.error.message).toBe("Invalid username or password.");
  });

  let sessionCookie: string;
  let csrfCookie: string;
  let csrfToken: string;

  it("successfully logs in with valid credentials, setting session and CSRF cookies", async () => {
    const res = await request(app)
      .post("/api/v1/admin-auth/login")
      .send({
        username: testUsername,
        password: testPassword,
      });

    expect(res.status).toBe(200);
    expect(res.body.data.username).toBe(testUsername);
    expect(res.body.meta.csrfToken).toBeDefined();
    csrfToken = res.body.meta.csrfToken;

    const cookies = res.headers["set-cookie"] as string[];
    expect(cookies).toBeDefined();

    // Check session cookie
    const sessionCookieHeader = cookies.find((c) => c.startsWith(`${SESSION_COOKIE_NAME}=`));
    expect(sessionCookieHeader).toBeDefined();
    expect(sessionCookieHeader).toMatch(/HttpOnly/i);
    expect(sessionCookieHeader).toMatch(/SameSite=Lax/i);
    sessionCookie = sessionCookieHeader!.split(";")[0];

    // Check CSRF cookie
    const csrfCookieHeader = cookies.find((c) => c.startsWith(`${CSRF_COOKIE_NAME}=`));
    expect(csrfCookieHeader).toBeDefined();
    csrfCookie = csrfCookieHeader!.split(";")[0];
  });

  it("retrieves current session with valid cookie", async () => {
    const res = await request(app)
      .get("/api/v1/admin-auth/session")
      .set("Cookie", [sessionCookie]);

    expect(res.status).toBe(200);
    expect(res.body.data.username).toBe(testUsername);
    expect(res.body.data.role).toBe("ADMIN");
  });

  it("rejects session retrieval without cookie", async () => {
    const res = await request(app).get("/api/v1/admin-auth/session");
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHORIZED");
  });

  it("rejects session retrieval with forged or invalid cookie", async () => {
    const res = await request(app)
      .get("/api/v1/admin-auth/session")
      .set("Cookie", [`${SESSION_COOKIE_NAME}=forged_random_hex_token_123456789012345678901234567890`]);

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHORIZED");
  });

  it("logs out and revokes the session", async () => {
    const res = await request(app)
      .post("/api/v1/admin-auth/logout")
      .set("Cookie", [sessionCookie, csrfCookie])
      .set(CSRF_HEADER_NAME, csrfToken);

    expect(res.status).toBe(200);
    expect(res.body.data.success).toBe(true);

    // Verify session is now revoked in database and subsequent call fails
    const verifyRes = await request(app)
      .get("/api/v1/admin-auth/session")
      .set("Cookie", [sessionCookie]);

    expect(verifyRes.status).toBe(401);
    expect(verifyRes.body.error.message).toMatch(/revoked|not found|expired/i);
  });

  it("updates the administrator email and password, then revokes every active session", async () => {
    const login = await request(app)
      .post("/api/v1/admin-auth/login")
      .send({ username: testUsername, password: testPassword });

    expect(login.status).toBe(200);
    const cookies = login.headers["set-cookie"] as string[];
    const session = cookies.find((cookie) => cookie.startsWith(`${SESSION_COOKIE_NAME}=`))!;
    const csrf = cookies.find((cookie) => cookie.startsWith(`${CSRF_COOKIE_NAME}=`))!;
    const sessionValue = session.split(";")[0];
    const csrfValue = csrf.split(";")[0];
    const csrfTokenValue = login.body.meta.csrfToken;

    const updatedEmail = "admin_updated@fashion.local";
    const updatedPassword = "A-Much-Stronger-Passphrase-2026!";

    const update = await request(app)
      .put("/api/v1/admin-auth/security")
      .set("Cookie", [sessionValue, csrfValue])
      .set(CSRF_HEADER_NAME, csrfTokenValue)
      .send({
        email: updatedEmail,
        currentPassword: testPassword,
        newPassword: updatedPassword,
      });

    expect(update.status).toBe(200);
    expect(update.body.data).toMatchObject({
      success: true,
      email: updatedEmail,
      reauthenticationRequired: true,
    });

    const oldSession = await request(app)
      .get("/api/v1/admin-auth/session")
      .set("Cookie", [sessionValue]);
    expect(oldSession.status).toBe(401);

    const oldEmailAdmin = await adminAuthRepository.findByUsername(testUsername);
    const updatedAdmin = await adminAuthRepository.findByUsername(updatedEmail);
    expect(oldEmailAdmin).toBeNull();
    expect(updatedAdmin).toBeDefined();
    expect(await adminAuthService.verifyPassword(updatedAdmin!.passwordHash, updatedPassword)).toBe(true);
    expect(await adminAuthService.verifyPassword(updatedAdmin!.passwordHash, testPassword)).toBe(false);
  });

  it("rejects an invalid email identifier at the login schema boundary", () => {
    expect(() =>
      loginSchema.parse({ username: "not-an-email", password: testPassword })
    ).toThrow();
  });
});
