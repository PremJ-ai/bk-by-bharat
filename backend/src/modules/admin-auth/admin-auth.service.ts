import crypto from "node:crypto";
import argon2 from "argon2";
import { adminAuthRepository, AdminAuthRepository } from "./admin-auth.repository.js";
import { UnauthorizedError, ConflictError, ValidationError } from "../../lib/errors.js";
import { SESSION_TTL_MS } from "../../config/constants.js";
import { hashSessionToken } from "../../middleware/authenticate.js";
import type { AdminUser, AdminRole } from "@prisma/client";

export interface SafeAdminUserDTO {
  id: string;
  username: string;
  role: string;
  status: string;
  createdAt: string;
}

export class AdminAuthService {
  constructor(private repo: AdminAuthRepository = adminAuthRepository) {}

  toDTO(admin: AdminUser): SafeAdminUserDTO {
    return {
      id: admin.id,
      username: admin.username,
      role: admin.role,
      status: admin.status,
      createdAt: admin.createdAt.toISOString(),
    };
  }

  async hashPassword(password: string): Promise<string> {
    return argon2.hash(password, {
      type: argon2.argon2id,
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 4,
    });
  }

  async verifyPassword(hash: string, plain: string): Promise<boolean> {
    try {
      return await argon2.verify(hash, plain);
    } catch {
      return false;
    }
  }

  async bootstrapFirstAdmin(username: string, password: string): Promise<SafeAdminUserDTO> {
    const normalizedEmail = username.toLowerCase().trim();
    if (!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(normalizedEmail)) {
      throw new ValidationError("Administrator login must use a valid email address.");
    }
    if (password.length < 14 || password.length > 128) {
      throw new ValidationError("Use an administrator password between 14 and 128 characters.");
    }

    const existingCount = await this.repo.countAdmins();
    if (existingCount > 0) {
      throw new ConflictError("Bootstrap refused: An administrator already exists.");
    }

    const passwordHash = await this.hashPassword(password);
    const admin = await this.repo.createAdminUser({
      username,
      passwordHash,
      role: "ADMIN",
      status: "ACTIVE",
    });

    await this.repo.createAuditEvent({
      actorAdminId: admin.id,
      action: "ADMIN_BOOTSTRAP",
      resourceType: "AdminUser",
      resourceId: admin.id,
      details: { username: admin.username },
    });

    return this.toDTO(admin);
  }

  async login(
    input: { username: string; password: string },
    metadata: { ipAddress?: string; userAgent?: string }
  ): Promise<{ admin: SafeAdminUserDTO; sessionToken: string; expiresAt: Date }> {
    const admin = await this.repo.findByUsername(input.username);

    // Constant-time mitigation against user enumeration
    if (!admin) {
      // Fake verify with dummy hash
      await argon2.verify(
        "$argon2id$v=19$m=65536,t=3,p=4$c29tZXNhbHQ$P6V01n8G+sX9+5y612J2kO0+1234567890123456789",
        input.password
      ).catch(() => {});
      throw new UnauthorizedError("Invalid username or password.");
    }

    if (admin.status !== "ACTIVE") {
      throw new UnauthorizedError("Account is not active.");
    }

    const isValid = await this.verifyPassword(admin.passwordHash, input.password);
    if (!isValid) {
      await this.repo.createAuditEvent({
        actorAdminId: admin.id,
        action: "ADMIN_LOGIN_FAILED",
        resourceType: "AdminUser",
        resourceId: admin.id,
        ipAddress: metadata.ipAddress,
      });
      throw new UnauthorizedError("Invalid username or password.");
    }

    // Session rotation: generate fresh 32-byte high-entropy opaque token
    const sessionToken = crypto.randomBytes(32).toString("hex");
    const sessionTokenHash = hashSessionToken(sessionToken);
    const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

    await this.repo.createSession({
      adminUserId: admin.id,
      sessionTokenHash,
      expiresAt,
      ipAddress: metadata.ipAddress,
      userAgent: metadata.userAgent,
    });

    await this.repo.createAuditEvent({
      actorAdminId: admin.id,
      action: "ADMIN_LOGIN_SUCCESS",
      resourceType: "AdminUser",
      resourceId: admin.id,
      ipAddress: metadata.ipAddress,
    });

    return {
      admin: this.toDTO(admin),
      sessionToken,
      expiresAt,
    };
  }

  async updateSecurity(
    adminId: string,
    input: { email: string; currentPassword: string; newPassword?: string },
    ipAddress?: string
  ): Promise<SafeAdminUserDTO> {
    const admin = await this.repo.findById(adminId);
    if (!admin || admin.status !== "ACTIVE") {
      throw new UnauthorizedError("Administrator account is not active.");
    }

    if (!(await this.verifyPassword(admin.passwordHash, input.currentPassword))) {
      await this.repo.createAuditEvent({
        actorAdminId: admin.id,
        action: "ADMIN_SECURITY_UPDATE_FAILED",
        resourceType: "AdminUser",
        resourceId: admin.id,
        ipAddress,
      });
      throw new UnauthorizedError("Current password is incorrect.");
    }

    const email = input.email.toLowerCase().trim();
    if (!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email)) {
      throw new ValidationError("Enter a valid administrator email address.");
    }

    const existing = await this.repo.findByUsername(email);
    if (existing && existing.id !== admin.id) {
      throw new ConflictError("That administrator email is already assigned to another account.");
    }

    let passwordHash: string | undefined;
    if (input.newPassword) {
      if (input.newPassword.length < 14 || input.newPassword.length > 128) {
        throw new ValidationError("Use a new password between 14 and 128 characters.");
      }
      if (input.newPassword === input.currentPassword) {
        throw new ValidationError("Choose a new password that is different from the current password.");
      }
      passwordHash = await this.hashPassword(input.newPassword);
    }

    const updated = await this.repo.updateAdminCredentials(admin.id, {
      username: email,
      passwordHash,
    });

    // Credential changes revoke every browser/device session; reauthentication is required.
    await this.repo.revokeAllUserSessions(admin.id);
    await this.repo.createAuditEvent({
      actorAdminId: admin.id,
      action: "ADMIN_SECURITY_UPDATED",
      resourceType: "AdminUser",
      resourceId: admin.id,
      details: {
        emailChanged: admin.username !== email,
        passwordChanged: Boolean(passwordHash),
      },
      ipAddress,
    });

    return this.toDTO(updated);
  }

  async logout(sessionToken: string, adminId?: string, ipAddress?: string): Promise<void> {
    const sessionTokenHash = hashSessionToken(sessionToken);
    await this.repo.revokeSession(sessionTokenHash);

    if (adminId) {
      await this.repo.createAuditEvent({
        actorAdminId: adminId,
        action: "ADMIN_LOGOUT",
        resourceType: "AdminSession",
        ipAddress,
      });
    }
  }

  async getSession(adminUserId: string): Promise<SafeAdminUserDTO> {
    const admin = await this.repo.findById(adminUserId);
    if (!admin || admin.status !== "ACTIVE") {
      throw new UnauthorizedError("Admin session invalid or expired.");
    }
    return this.toDTO(admin);
  }
}

export const adminAuthService = new AdminAuthService();
