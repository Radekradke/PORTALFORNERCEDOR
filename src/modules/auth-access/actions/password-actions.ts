"use server";

import { z } from "zod";
import { headers } from "next/headers";
import {
  requestPasswordReset,
  resetPassword,
  PasswordResetError,
} from "../services/password-reset-service";

export interface ForgotPasswordState {
  submitted?: boolean;
  error?: string;
}

const forgotSchema = z.object({
  email: z.string().trim().min(1, "Informe o e-mail.").email("Informe um e-mail válido."),
});

export async function forgotPasswordAction(
  _prevState: ForgotPasswordState,
  formData: FormData,
): Promise<ForgotPasswordState> {
  const parsed = forgotSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const headerList = headers();
  await requestPasswordReset(parsed.data.email, {
    ip: headerList.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
    userAgent: headerList.get("user-agent"),
  });

  // Sempre retorna sucesso, mesmo se o e-mail não existir (evita enumeração).
  return { submitted: true };
}

export interface ResetPasswordState {
  error?: string;
  success?: boolean;
}

const resetSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(1, "Informe a nova senha."),
  passwordConfirmation: z.string().min(1, "Confirme a nova senha."),
});

export async function resetPasswordAction(
  _prevState: ResetPasswordState,
  formData: FormData,
): Promise<ResetPasswordState> {
  const parsed = resetSchema.safeParse({
    token: formData.get("token"),
    password: formData.get("password"),
    passwordConfirmation: formData.get("passwordConfirmation"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  if (parsed.data.password !== parsed.data.passwordConfirmation) {
    return { error: "As senhas não coincidem." };
  }

  const headerList = headers();

  try {
    await resetPassword({
      token: parsed.data.token,
      newPassword: parsed.data.password,
      context: {
        ip: headerList.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
        userAgent: headerList.get("user-agent"),
      },
    });
  } catch (err) {
    if (err instanceof PasswordResetError) {
      return { error: err.message };
    }
    throw err;
  }

  return { success: true };
}
