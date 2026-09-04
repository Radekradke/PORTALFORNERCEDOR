import { randomBytes, createHash } from "node:crypto";

/**
 * Tokens opacos (sessão, redefinição de senha, ativação de convite): o valor
 * em claro só existe no cookie/link enviado ao usuário. O banco guarda apenas
 * o hash SHA-256, para que um vazamento do banco não permita reuso dos tokens.
 */
export function generateOpaqueToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
