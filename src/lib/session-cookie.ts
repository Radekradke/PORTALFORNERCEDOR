import "server-only";
import { cookies } from "next/headers";
import { getEnv } from "@/lib/env";

/**
 * Cookie opaco de sessão: HttpOnly (não legível por JS), Secure em produção
 * e SameSite=Lax (mitiga CSRF básico; mutações também usam Server Actions,
 * que o Next.js protege verificando Origin/Host).
 */
export function setSessionCookie(token: string, expiresAt: Date): void {
  const env = getEnv();
  cookies().set(env.SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export function readSessionCookie(): string | undefined {
  const env = getEnv();
  return cookies().get(env.SESSION_COOKIE_NAME)?.value;
}

export function clearSessionCookie(): void {
  const env = getEnv();
  cookies().set(env.SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: new Date(0),
  });
}
