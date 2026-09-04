import { prisma } from "@/lib/prisma";
import { getEnv } from "@/lib/env";
import { generateOpaqueToken, hashToken } from "@/lib/tokens";
import { hashPassword, isPasswordStrongEnough, PASSWORD_MIN_LENGTH } from "@/lib/password";
import { checkRateLimit } from "@/lib/rate-limit";
import { recordAudit } from "@/modules/audit/services/audit-service";
import { revokeAllSessionsForUser } from "./session-service";
import { getMailProvider } from "@/lib/mail";

export class PasswordResetError extends Error {}

interface RequestContext {
  ip: string | null;
  userAgent: string | null;
}

/**
 * Gera um token de definição/redefinição de senha e envia por e-mail.
 * Usado tanto para "esqueci minha senha" quanto para ativação de convite
 * (RF-002, RF-016) — o mesmo mecanismo seguro, dois textos de e-mail.
 *
 * Nunca revela se o e-mail existe: o chamador sempre recebe sucesso.
 */
export async function requestPasswordReset(
  rawEmail: string,
  context: RequestContext,
  reason: "forgot_password" | "invite" = "forgot_password",
): Promise<void> {
  const env = getEnv();
  const email = rawEmail.trim().toLowerCase();

  const rateLimitKey = `password-reset:${email}:${context.ip ?? "unknown"}`;
  const rate = checkRateLimit(rateLimitKey, 5, 15 * 60 * 1000);
  if (!rate.allowed) {
    // Silencioso por fora (não revela nada), mas não gera novo token.
    return;
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || user.status === "BLOCKED" || user.status === "INACTIVE") {
    return;
  }

  const token = generateOpaqueToken();
  const expiresAt = new Date(Date.now() + env.PASSWORD_RESET_TTL_MINUTES * 60 * 1000);

  await prisma.$transaction(async (tx) => {
    await tx.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(token),
        expiresAt,
        requestedIp: context.ip,
      },
    });
    await recordAudit(
      {
        actorId: user.id,
        action: reason === "invite" ? "auth.invite.token_issued" : "auth.password_reset.requested",
        entityType: "User",
        entityId: user.id,
        context: { source: "web", ip: context.ip, userAgent: context.userAgent },
      },
      tx,
    );
  });

  const link = `${env.APP_URL}/redefinir-senha?token=${token}`;
  const subject =
    reason === "invite"
      ? "Ative seu acesso — Portal de Fornecedores Lifting"
      : "Redefinição de senha — Portal de Fornecedores Lifting";
  const intro =
    reason === "invite"
      ? `Olá, ${user.name}. Uma conta foi criada para você no Portal de Fornecedores da Lifting.`
      : `Olá, ${user.name}. Recebemos um pedido de redefinição de senha.`;

  await getMailProvider().send({
    to: user.email,
    subject,
    text: `${intro}\n\nDefina sua senha pelo link (válido por ${env.PASSWORD_RESET_TTL_MINUTES} minutos): ${link}\n\nSe você não reconhece esta solicitação, ignore este e-mail.`,
    html: `<p>${intro}</p><p>Defina sua senha pelo link abaixo (válido por ${env.PASSWORD_RESET_TTL_MINUTES} minutos):</p><p><a href="${link}">${link}</a></p><p>Se você não reconhece esta solicitação, ignore este e-mail.</p>`,
  });
}

export interface ResetPasswordInput {
  token: string;
  newPassword: string;
  context: RequestContext;
}

export async function resetPassword(input: ResetPasswordInput): Promise<void> {
  if (!isPasswordStrongEnough(input.newPassword)) {
    throw new PasswordResetError(
      `A senha deve ter ao menos ${PASSWORD_MIN_LENGTH} caracteres, com letras e números ou símbolos.`,
    );
  }

  const tokenHash = hashToken(input.token);
  const resetToken = await prisma.passwordResetToken.findUnique({
    where: { tokenHash },
    include: { user: true },
  });

  if (
    !resetToken ||
    resetToken.usedAt ||
    resetToken.expiresAt.getTime() <= Date.now()
  ) {
    throw new PasswordResetError("Link inválido ou expirado. Solicite um novo.");
  }

  if (resetToken.user.status === "BLOCKED" || resetToken.user.status === "INACTIVE") {
    throw new PasswordResetError("Conta indisponível para esta ação.");
  }

  const passwordHash = await hashPassword(input.newPassword);

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: resetToken.userId },
      data: {
        passwordHash,
        status: "ACTIVE",
        failedLoginCount: 0,
        lockedUntil: null,
      },
    });
    await tx.passwordResetToken.update({
      where: { id: resetToken.id },
      data: { usedAt: new Date() },
    });
    await recordAudit(
      {
        actorId: resetToken.userId,
        action: "auth.password_reset.completed",
        entityType: "User",
        entityId: resetToken.userId,
        context: { source: "web", ip: input.context.ip, userAgent: input.context.userAgent },
      },
      tx,
    );
  });

  // Redefinir senha revoga sessões existentes (RF-003 / boa prática de segurança).
  await revokeAllSessionsForUser(resetToken.userId);
}
