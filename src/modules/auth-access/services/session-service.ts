import { prisma } from "@/lib/prisma";
import { getEnv } from "@/lib/env";
import { generateOpaqueToken, hashToken } from "@/lib/tokens";
import type { Actor } from "../domain/actor";

export interface CreateSessionInput {
  userId: string;
  ip?: string | null;
  userAgent?: string | null;
}

export interface CreatedSession {
  token: string;
  expiresAt: Date;
}

export async function createSession(input: CreateSessionInput): Promise<CreatedSession> {
  const env = getEnv();
  const token = generateOpaqueToken();
  const expiresAt = new Date(Date.now() + env.SESSION_TTL_HOURS * 60 * 60 * 1000);

  await prisma.session.create({
    data: {
      userId: input.userId,
      tokenHash: hashToken(token),
      expiresAt,
      ipAddress: input.ip ?? null,
      userAgent: input.userAgent ?? null,
    },
  });

  return { token, expiresAt };
}

/**
 * Carrega o ator autenticado a partir do token opaco da sessão, validando
 * expiração e revogação no servidor. É o único caminho autoritativo para
 * saber "quem está autenticado" — o middleware apenas evita flash de UI.
 */
export async function getActorFromToken(token: string): Promise<Actor | null> {
  const tokenHash = hashToken(token);

  const session = await prisma.session.findUnique({
    where: { tokenHash },
    include: {
      user: {
        include: {
          grantedPermissions: {
            where: { revokedAt: null },
            select: { permission: true },
          },
        },
      },
    },
  });

  if (!session) return null;
  if (session.revokedAt) return null;
  if (session.expiresAt.getTime() <= Date.now()) return null;

  const { user } = session;

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status,
    supplierId: user.supplierId,
    sensitivePermissions: user.grantedPermissions.map((p) => p.permission),
  };
}

export async function revokeSessionByToken(token: string): Promise<void> {
  const tokenHash = hashToken(token);
  await prisma.session.updateMany({
    where: { tokenHash, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

/** Logout em todos os dispositivos (RF-003). */
export async function revokeAllSessionsForUser(userId: string): Promise<void> {
  await prisma.session.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}
