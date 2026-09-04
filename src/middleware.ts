import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * O middleware roda no Edge Runtime e por isso NÃO consulta o banco: ele
 * apenas evita o "flash" de UI protegida quando não há cookie de sessão.
 * A checagem autoritativa (sessão válida, não expirada, não revogada, papel
 * e permissões) acontece sempre no servidor via `getCurrentActor()` /
 * `requireActor()` em cada layout, página e Server Action (RNF-002).
 */
const PUBLIC_PATHS = ["/login", "/esqueci-senha", "/redefinir-senha"];
const SESSION_COOKIE_NAME = process.env.SESSION_COOKIE_NAME || "portal_session";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSessionCookie = request.cookies.has(SESSION_COOKIE_NAME);
  const isPublicPath = PUBLIC_PATHS.some((path) => pathname.startsWith(path));

  if (pathname === "/") {
    const url = request.nextUrl.clone();
    url.pathname = hasSessionCookie ? "/dashboard" : "/login";
    return NextResponse.redirect(url);
  }

  if (!isPublicPath && !hasSessionCookie) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    return NextResponse.redirect(url);
  }

  if (isPublicPath && hasSessionCookie) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
