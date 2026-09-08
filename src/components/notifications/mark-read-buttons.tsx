"use client";

import { useFormState } from "react-dom";
import {
  markNotificationReadAction,
  markAllNotificationsReadAction,
  type ActionState,
} from "@/modules/notifications/actions/notification-actions";
import { SubmitButton } from "@/components/ui/submit-button";

const initialState: ActionState = {};

export function MarkReadButton({ notificationId }: { notificationId: string }) {
  const [, formAction] = useFormState(markNotificationReadAction, initialState);
  return (
    <form action={formAction}>
      <input type="hidden" name="notificationId" value={notificationId} />
      <SubmitButton variant="ghost" size="sm">
        Marcar como lida
      </SubmitButton>
    </form>
  );
}

export function MarkAllReadButton() {
  const [, formAction] = useFormState(markAllNotificationsReadAction, initialState);
  return (
    <form action={formAction}>
      <SubmitButton variant="outline" size="sm">
        Marcar todas como lidas
      </SubmitButton>
    </form>
  );
}
