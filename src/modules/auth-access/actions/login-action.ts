"use server";

import { z } from "zod";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { login, LoginError } from "../services/auth-service";
import { setSessionCookie } from "@/lib/session-cookie";

const loginSchema = z.object({
  email: z.string().trim().min(1, "Informe o e-mail.").email("Informe um e-mail válido."),
  password: z.string().min(1, "Informe a senha."),
});

export interface LoginActionState {
  error?: string;
}

export async function loginAction(
  _prevState: LoginActionState,
  formData: FormData,
): Promise<LoginActionState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const headerList = headers();
  const ip = headerList.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  const userAgent = headerList.get("user-agent");

  try {
    const session = await login({
      email: parsed.data.email,
      password: parsed.data.password,
      ip,
      userAgent,
    });
    setSessionCookie(session.token, session.expiresAt);
  } catch (err) {
    if (err instanceof LoginError) {
      return { error: err.message };
    }
    throw err;
  }

  redirect("/dashboard");
}
