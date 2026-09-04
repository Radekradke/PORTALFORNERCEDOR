import type { SensitivePermission, UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { recordAudit } from "@/modules/audit/services/audit-service";
import { requestPasswordReset } from "@/modules/auth-access/services/password-reset-service";
import { revokeAllSessionsForUser } from "@/modules/auth-access/services/session-service";
import { assertAuthorized } from "@/modules/auth-access/domain/authorize";
import type { Actor } from "@/modules/auth-access/domain/actor";

export class UserServiceError extends Error {}

const INTERNAL_ROLES: UserRole[] = ["ADMIN_TI", "COMPRAS", "QSMS"];

interface RequestContext {
  ip: string | null;
  userAgent: string | null;
}

export interface CreateInternalUserInput {
  name: string;
  email: string;
  role: UserRole;
}

/**
 * Cria um usuário interno (Admin TI, Compras ou QSMS) e envia e-mail de
 * ativação para que ele defina a própria senha (RF-004, RF-005).
 */
export async function createInternalUser(
  actor: Actor,
  input: CreateInternalUserInput,
  context: RequestContext,
) {
  assertAuthorized(actor, "user.create");

  if (!INTERNAL_ROLES.includes(input.role)) {
    throw new UserServiceError("Perfil inválido para usuário interno.");
  }

  const email = input.email.trim().toLowerCase();

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw new UserServiceError("Já existe um usuário com este e-mail.");
  }

  const user = await prisma.$transaction(async (tx) => {
    const created = await tx.user.create({
      data: {
        name: input.name.trim(),
        email,
        role: input.role,
        status: "INVITED",
      },
    });

    await recordAudit(
      {
        actorId: actor.id,
        action: "user.create",
        entityType: "User",
        entityId: created.id,
        after: { name: created.name, email: created.email, role: created.role },
        context: { source: "web", ip: context.ip, userAgent: context.userAgent },
      },
      tx,
    );

    return created;
  });

  await requestPasswordReset(user.email, context, "invite");

  return user;
}

export async function blockUser(
  actor: Actor,
  targetUserId: string,
  reason: string,
  context: RequestContext,
) {
  assertAuthorized(actor, "user.block");

  if (!reason.trim()) {
    throw new UserServiceError("Informe o motivo do bloqueio.");
  }

  if (targetUserId === actor.id) {
    throw new UserServiceError("Você não pode bloquear a própria conta.");
  }

  const target = await prisma.user.findUnique({ where: { id: targetUserId } });
  if (!target) throw new UserServiceError("Usuário não encontrado.");

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: targetUserId },
      data: { status: "BLOCKED" },
    });
    await recordAudit(
      {
        actorId: actor.id,
        action: "user.block",
        entityType: "User",
        entityId: targetUserId,
        reason,
        before: { status: target.status },
        after: { status: "BLOCKED" },
        context: { source: "web", ip: context.ip, userAgent: context.userAgent },
      },
      tx,
    );
  });

  await revokeAllSessionsForUser(targetUserId);
}

export async function unblockUser(
  actor: Actor,
  targetUserId: string,
  reason: string,
  context: RequestContext,
) {
  assertAuthorized(actor, "user.unblock");

  if (!reason.trim()) {
    throw new UserServiceError("Informe o motivo do desbloqueio.");
  }

  const target = await prisma.user.findUnique({ where: { id: targetUserId } });
  if (!target) throw new UserServiceError("Usuário não encontrado.");
  if (target.status !== "BLOCKED") {
    throw new UserServiceError("Usuário não está bloqueado.");
  }

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: targetUserId },
      data: { status: "ACTIVE", failedLoginCount: 0, lockedUntil: null },
    });
    await recordAudit(
      {
        actorId: actor.id,
        action: "user.unblock",
        entityType: "User",
        entityId: targetUserId,
        reason,
        before: { status: target.status },
        after: { status: "ACTIVE" },
        context: { source: "web", ip: context.ip, userAgent: context.userAgent },
      },
      tx,
    );
  });
}

const GRANTABLE_ROLES: UserRole[] = ["COMPRAS", "QSMS"];

export async function grantSensitivePermission(
  actor: Actor,
  targetUserId: string,
  permission: SensitivePermission,
  context: RequestContext,
) {
  assertAuthorized(actor, "permission.grant");

  const target = await prisma.user.findUnique({ where: { id: targetUserId } });
  if (!target) throw new UserServiceError("Usuário não encontrado.");
  if (!GRANTABLE_ROLES.includes(target.role)) {
    throw new UserServiceError(
      "Permissões sensíveis só podem ser concedidas a usuários de Compras ou QSMS.",
    );
  }

  const alreadyGranted = await prisma.userPermission.findFirst({
    where: { userId: targetUserId, permission, revokedAt: null },
  });
  if (alreadyGranted) {
    throw new UserServiceError("Usuário já possui esta permissão.");
  }

  await prisma.$transaction(async (tx) => {
    await tx.userPermission.create({
      data: {
        userId: targetUserId,
        permission,
        grantedById: actor.id,
      },
    });
    await recordAudit(
      {
        actorId: actor.id,
        action: "permission.grant",
        entityType: "User",
        entityId: targetUserId,
        after: { permission },
        context: { source: "web", ip: context.ip, userAgent: context.userAgent },
      },
      tx,
    );
  });
}

export async function revokeSensitivePermission(
  actor: Actor,
  targetUserId: string,
  permission: SensitivePermission,
  context: RequestContext,
) {
  assertAuthorized(actor, "permission.revoke");

  const grant = await prisma.userPermission.findFirst({
    where: { userId: targetUserId, permission, revokedAt: null },
  });
  if (!grant) throw new UserServiceError("Permissão não encontrada ou já revogada.");

  await prisma.$transaction(async (tx) => {
    await tx.userPermission.update({
      where: { id: grant.id },
      data: { revokedAt: new Date(), revokedById: actor.id },
    });
    await recordAudit(
      {
        actorId: actor.id,
        action: "permission.revoke",
        entityType: "User",
        entityId: targetUserId,
        before: { permission },
        context: { source: "web", ip: context.ip, userAgent: context.userAgent },
      },
      tx,
    );
  });
}

export async function listInternalUsers(actor: Actor) {
  assertAuthorized(actor, "user.view");

  return prisma.user.findMany({
    where: { role: { in: INTERNAL_ROLES } },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      status: true,
      lastLoginAt: true,
      createdAt: true,
      grantedPermissions: {
        where: { revokedAt: null },
        select: { permission: true },
      },
    },
  });
}

export async function getInternalUserById(actor: Actor, id: string) {
  assertAuthorized(actor, "user.view");

  return prisma.user.findFirst({
    where: { id, role: { in: INTERNAL_ROLES } },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      status: true,
      lastLoginAt: true,
      createdAt: true,
      grantedPermissions: {
        where: { revokedAt: null },
        select: { permission: true, grantedAt: true, grantedBy: { select: { name: true } } },
      },
    },
  });
}
