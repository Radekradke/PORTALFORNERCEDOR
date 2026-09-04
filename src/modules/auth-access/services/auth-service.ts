import { prisma } from "@/lib/prisma";
import { getEnv } from "@/lib/env";
import { verifyPassword } from "@/lib/password";
import { checkRateLimit } from "@/lib/rate-limit";
import { recordAudit } from "@/modules/audit/services/audit-service";
import { createSession, revokeSessionByToken } from "./session-service";

export class LoginError extends Error {
  constructor(
    message: string,
    public readonly code:
      | "INVALID_CREDENTIALS"
      | "ACCOUNT_LOCKED"
      | "ACCOUNT_BLOCKED"
      | "ACCOUNT_INACTIVE"
      | "RATE_LIMITED",
  ) {
    super(message);
    this.name = "LoginError";
  }
}

export interface LoginInput {
  email: string;
  password: string;
  ip: string | null;
  userAgent: string | null;
}

export interface LoginResult {
  token: string;
  expiresAt: Date;
}

const GENERIC_INVALID_MESSAGE = "E-mail ou senha inválidos.";

export async function login(input: LoginInput): Promise<LoginResult> {
  const env = getEnv();
  const email = input.email.trim().toLowerCase();

  // Limite por e-mail+IP: mitigação adicional de força bruta (ver rate-limit.ts).
  const rateLimitKey = `login:${email}:${input.ip ?? "unknown"}`;
  const rate = checkRateLimit(rateLimitKey, env.LOGIN_MAX_ATTEMPTS * 2, 15 * 60 * 1000);
  if (!rate.allowed) {
    throw new LoginError("Muitas tentativas. Tente novamente em alguns minutos.", "RATE_LIMITED");
  }

  const user = await prisma.user.findUnique({ where: { email } });

  const context = { source: "web" as const, ip: input.ip, userAgent: input.userAgent };

  if (!user) {
    await recordAudit({
      actorLabel: email,
      action: "auth.login.failure",
      entityType: "User",
      reason: "E-mail não cadastrado",
      context,
    });
    throw new LoginError(GENERIC_INVALID_MESSAGE, "INVALID_CREDENTIALS");
  }

  if (user.status === "BLOCKED") {
    await recordAudit({
      actorId: user.id,
      action: "auth.login.blocked_account",
      entityType: "User",
      entityId: user.id,
      context,
    });
    throw new LoginError(
      "Sua conta está bloqueada. Contate o administrador do sistema.",
      "ACCOUNT_BLOCKED",
    );
  }

  if (user.status === "INACTIVE") {
    await recordAudit({
      actorId: user.id,
      action: "auth.login.inactive_account",
      entityType: "User",
      entityId: user.id,
      context,
    });
    throw new LoginError("Esta conta está inativa.", "ACCOUNT_INACTIVE");
  }

  if (user.lockedUntil && user.lockedUntil.getTime() > Date.now()) {
    await recordAudit({
      actorId: user.id,
      action: "auth.login.locked_attempt",
      entityType: "User",
      entityId: user.id,
      context,
    });
    throw new LoginError(
      "Conta temporariamente bloqueada por tentativas inválidas. Tente novamente mais tarde ou use 'Esqueci minha senha'.",
      "ACCOUNT_LOCKED",
    );
  }

  const passwordOk = user.passwordHash
    ? await verifyPassword(user.passwordHash, input.password)
    : false;

  if (!passwordOk) {
    const failedCount = user.failedLoginCount + 1;
    const shouldLock = failedCount >= env.LOGIN_MAX_ATTEMPTS;

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: user.id },
        data: {
          failedLoginCount: shouldLock ? 0 : failedCount,
          lockedUntil: shouldLock
            ? new Date(Date.now() + env.LOGIN_LOCK_MINUTES * 60 * 1000)
            : null,
        },
      });

      await recordAudit(
        {
          actorId: user.id,
          action: shouldLock ? "auth.login.locked" : "auth.login.failure",
          entityType: "User",
          entityId: user.id,
          context,
          after: shouldLock ? { lockedForMinutes: env.LOGIN_LOCK_MINUTES } : undefined,
        },
        tx,
      );
    });

    if (shouldLock) {
      throw new LoginError(
        `Conta bloqueada temporariamente por ${env.LOGIN_LOCK_MINUTES} minutos após várias tentativas inválidas.`,
        "ACCOUNT_LOCKED",
      );
    }

    throw new LoginError(GENERIC_INVALID_MESSAGE, "INVALID_CREDENTIALS");
  }

  const session = await createSession({ userId: user.id, ip: input.ip, userAgent: input.userAgent });

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: user.id },
      data: { failedLoginCount: 0, lockedUntil: null, lastLoginAt: new Date() },
    });
    await recordAudit(
      {
        actorId: user.id,
        action: "auth.login.success",
        entityType: "User",
        entityId: user.id,
        context,
      },
      tx,
    );
  });

  return session;
}

export async function logout(
  token: string,
  actorId: string | null,
  context: { ip: string | null; userAgent: string | null },
): Promise<void> {
  await revokeSessionByToken(token);
  await recordAudit({
    actorId,
    action: "auth.logout",
    entityType: "User",
    entityId: actorId,
    context: { source: "web", ip: context.ip, userAgent: context.userAgent },
  });
}
