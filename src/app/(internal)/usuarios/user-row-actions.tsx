"use client";

import { useFormState } from "react-dom";
import { useState } from "react";
import { blockUserAction, unblockUserAction, type ActionState } from "@/modules/users-permissions/actions/user-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { FormError } from "@/components/ui/form-error";

const initialState: ActionState = {};

export function UserRowActions({ userId, status }: { userId: string; status: string }) {
  const [open, setOpen] = useState(false);
  const action = status === "BLOCKED" ? unblockUserAction : blockUserAction;
  const [state, formAction] = useFormState(action, initialState);

  if (status === "INVITED") {
    return <span className="text-xs text-muted-foreground">Aguardando ativação</span>;
  }

  if (!open) {
    return (
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        {status === "BLOCKED" ? "Desbloquear" : "Bloquear"}
      </Button>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-2 rounded-md border p-3">
      <input type="hidden" name="userId" value={userId} />
      <FormError message={state.error} />
      <label className="text-xs font-medium" htmlFor={`reason-${userId}`}>
        Motivo ({status === "BLOCKED" ? "desbloqueio" : "bloqueio"})
      </label>
      <Input id={`reason-${userId}`} name="reason" required aria-required="true" />
      <div className="flex gap-2">
        <SubmitButton size="sm" variant={status === "BLOCKED" ? "default" : "destructive"}>
          Confirmar
        </SubmitButton>
        <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
