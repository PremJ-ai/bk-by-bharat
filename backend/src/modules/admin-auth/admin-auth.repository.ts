import { prisma } from "../../db/prisma.js";
import type { AdminUser, AdminSession, AdminRole, AdminStatus } from "@prisma/client";

export class AdminAuthRepository {
  async findByUsername(username: string): Promise<AdminUser | null> {
    return prisma.adminUser.findUnique({
      where: { username: username.toLowerCase().trim() },
    });
  }

  async findById(id: string): Promise<AdminUser | null> {
    return prisma.adminUser.findUnique({
      where: { id },
    });
  }

  async countAdmins(): Promise<number> {
    return prisma.adminUser.count();
  }

  async createAdminUser(data: {
    username: string;
    passwordHash: string;
    role?: AdminRole;
    status?: AdminStatus;
  }): Promise<AdminUser> {
    return prisma.adminUser.create({
      data: {
        username: data.username.toLowerCase().trim(),
        passwordHash: data.passwordHash,
        role: data.role ?? "ADMIN",
        status: data.status ?? "ACTIVE",
      },
    });
  }

  async createSession(data: {
    adminUserId: string;
    sessionTokenHash: string;
    expiresAt: Date;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<AdminSession> {
    return prisma.adminSession.create({
      data: {
        adminUserId: data.adminUserId,
        sessionTokenHash: data.sessionTokenHash,
        expiresAt: data.expiresAt,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
      },
    });
  }

  async findSessionByHash(sessionTokenHash: string): Promise<(AdminSession & { adminUser: AdminUser }) | null> {
    return prisma.adminSession.findUnique({
      where: { sessionTokenHash },
      include: { adminUser: true },
    });
  }

  async revokeSession(sessionTokenHash: string): Promise<void> {
    await prisma.adminSession.updateMany({
      where: { sessionTokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async revokeAllUserSessions(adminUserId: string): Promise<void> {
    await prisma.adminSession.updateMany({
      where: { adminUserId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async createAuditEvent(data: {
    actorAdminId?: string;
    action: string;
    resourceType: string;
    resourceId?: string;
    details?: any;
    ipAddress?: string;
  }): Promise<void> {
    try {
      await prisma.auditEvent.create({
        data: {
          actorAdminId: data.actorAdminId,
          action: data.action,
          resourceType: data.resourceType,
          resourceId: data.resourceId,
          details: data.details,
          ipAddress: data.ipAddress,
        },
      });
    } catch {
      // Audit event creation must not crash the primary flow
    }
  }
}

export const adminAuthRepository = new AdminAuthRepository();
