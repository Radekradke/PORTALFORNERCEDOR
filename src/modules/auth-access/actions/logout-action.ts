"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { readSessionCookie, clearSessionCookie } from "@/lib/session-cookie";
import { logout } from "../services/auth-service";
import { getCurrentActor } from "../services/current-actor";

export async function logoutAction(): Promise<void> {
  const token = readSessionCookie();
  const actor = await getCurrentActor();
  const headerList = headers();

  if (token) {
    await logout(token, actor?.id ?? null, {
      ip: headerList.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
      userAgent: headerList.get("user-agent"),
    });
  }

  clearSessionCookie();
  redirect("/login");
}
