"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireActor } from "@/modules/auth-access/services/current-actor";
import { markNotificationRead, markAllNotificationsRead, NotificationServiceError } from "../services/notification-service";

export interface ActionState {
  error?: string;
  success?: boolean;
}

function handleKnownErrors(err: unknown): ActionState {
  if (err instanceof NotificationServiceError) return { error: err.message };
  throw err;
}

function revalidateNotificationPaths() {
  revalidatePath("/notificacoes");
  revalidatePath("/portal-fornecedor/notificacoes");
}

const idSchema = z.object({ notificationId: z.string().min(1) });

export async function markNotificationReadAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = idSchema.safeParse({ notificationId: formData.get("notificationId") });
  if (!parsed.success) return { error: "Dados inválidos." };

  try {
    const actor = await requireActor();
    await markNotificationRead(actor, parsed.data.notificationId);
  } catch (err) {
    return handleKnownErrors(err);
  }

  revalidateNotificationPaths();
  return { success: true };
}

export async function markAllNotificationsReadAction(_prevState: ActionState): Promise<ActionState> {
  const actor = await requireActor();
  await markAllNotificationsRead(actor);
  revalidateNotificationPaths();
  return { success: true };
}
