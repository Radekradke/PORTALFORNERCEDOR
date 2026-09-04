"use server";

import { z } from "zod";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { requireActor } from "@/modules/auth-access/services/current-actor";
import { AuthorizationError } from "@/modules/auth-access/domain/authorize";
import { createCategory, setCategoryActive, CategoryServiceError } from "../services/category-service";

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

const createSchema = z.object({
  code: z.string().trim().min(1, "Informe o código."),
  name: z.string().trim().min(2, "Informe o nome da categoria."),
  description: z.string().trim().optional(),
});

export async function createCategoryAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = createSchema.safeParse({
    code: formData.get("code"),
    name: formData.get("name"),
    description: formData.get("description") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  try {
    const actor = await requireActor();
    await createCategory(actor, parsed.data, requestContext());
  } catch (err) {
    if (err instanceof CategoryServiceError || err instanceof AuthorizationError) {
      return { error: err.message };
    }
    throw err;
  }

  revalidatePath("/categorias");
  return { success: true };
}

const toggleSchema = z.object({ categoryId: z.string().min(1), active: z.string() });

export async function toggleCategoryActiveAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = toggleSchema.safeParse({
    categoryId: formData.get("categoryId"),
    active: formData.get("active"),
  });
  if (!parsed.success) return { error: "Dados inválidos." };

  try {
    const actor = await requireActor();
    await setCategoryActive(actor, parsed.data.categoryId, parsed.data.active === "true", requestContext());
  } catch (err) {
    if (err instanceof CategoryServiceError || err instanceof AuthorizationError) {
      return { error: err.message };
    }
    throw err;
  }

  revalidatePath("/categorias");
  return { success: true };
}
