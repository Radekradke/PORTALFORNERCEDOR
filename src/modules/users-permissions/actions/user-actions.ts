"use server";

import { z } from "zod";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { requireActor } from "@/modules/auth-access/services/current-actor";
import { AuthorizationError } from "@/modules/auth-access/domain/authorize";
import {
  createInternalUser,
  blockUser,
  unblockUser,
  grantSensitivePermission,
  revokeSensitivePermission,
  UserServiceError,
} from "../services/user-service";

function requestContext() {
  const headerList = headers();
  return {
    ip: headerList.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
    userAgent: headerList.get("user-agent"),
  };
}

export interface ActionState {
  error?: string;
  success?: boolean;
}

const createUserSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome completo."),
  email: z.string().trim().min(1, "Informe o e-mail.").email("Informe um e-mail válido."),
  role: z.enum(["ADMIN_TI", "COMPRAS", "QSMS"], { errorMap: () => ({ message: "Selecione um perfil." }) }),
});

export async function createUserAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = createUserSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    role: formData.get("role"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  try {
    const actor = await requireActor();
    await createInternalUser(actor, parsed.data, requestContext());
  } catch (err) {
    if (err instanceof UserServiceError || err instanceof AuthorizationError) {
      return { error: err.message };
    }
    throw err;
  }

  revalidatePath("/usuarios");
  return { success: true };
}

const targetUserSchema = z.object({
  userId: z.string().min(1),
  reason: z.string().trim().min(3, "Informe o motivo."),
});

export async function blockUserAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = targetUserSchema.safeParse({
    userId: formData.get("userId"),
    reason: formData.get("reason"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  try {
    const actor = await requireActor();
    await blockUser(actor, parsed.data.userId, parsed.data.reason, requestContext());
  } catch (err) {
    if (err instanceof UserServiceError || err instanceof AuthorizationError) {
      return { error: err.message };
    }
    throw err;
  }

  revalidatePath("/usuarios");
  return { success: true };
}

export async function unblockUserAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = targetUserSchema.safeParse({
    userId: formData.get("userId"),
    reason: formData.get("reason"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  try {
    const actor = await requireActor();
    await unblockUser(actor, parsed.data.userId, parsed.data.reason, requestContext());
  } catch (err) {
    if (err instanceof UserServiceError || err instanceof AuthorizationError) {
      return { error: err.message };
    }
    throw err;
  }

  revalidatePath("/usuarios");
  return { success: true };
}

const permissionSchema = z.object({
  userId: z.string().min(1),
  permission: z.enum([
    "QUALIFICATION_DECIDE",
    "SUPPLIER_SUSPEND",
    "SUPPLIER_BLOCK",
    "SUPPLIER_UNBLOCK",
    "EXCEPTION_ACCEPT",
    "NC_REOPEN",
  ]),
});

export async function grantPermissionAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = permissionSchema.safeParse({
    userId: formData.get("userId"),
    permission: formData.get("permission"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  try {
    const actor = await requireActor();
    await grantSensitivePermission(actor, parsed.data.userId, parsed.data.permission, requestContext());
  } catch (err) {
    if (err instanceof UserServiceError || err instanceof AuthorizationError) {
      return { error: err.message };
    }
    throw err;
  }

  revalidatePath(`/usuarios/${parsed.data.userId}`);
  return { success: true };
}

export async function revokePermissionAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = permissionSchema.safeParse({
    userId: formData.get("userId"),
    permission: formData.get("permission"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  try {
    const actor = await requireActor();
    await revokeSensitivePermission(actor, parsed.data.userId, parsed.data.permission, requestContext());
  } catch (err) {
    if (err instanceof UserServiceError || err instanceof AuthorizationError) {
      return { error: err.message };
    }
    throw err;
  }

  revalidatePath(`/usuarios/${parsed.data.userId}`);
  return { success: true };
}
