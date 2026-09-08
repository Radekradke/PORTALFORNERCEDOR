"use client";

import { useFormState } from "react-dom";
import { useState } from "react";
import { reopenNonConformityAction, type ActionState } from "@/modules/nonconformities/actions/nc-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SubmitButton } from "@/components/ui/submit-button";
import { FormError } from "@/components/ui/form-error";

const initialState: ActionState = {};

/** RF-097: reabertura preserva o encerramento anterior — motivo, novo prazo e para qual etapa volta. */
export function ReopenForm({ ncId }: { ncId: string }) {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useFormState(reopenNonConformityAction, initialState);

  if (!open) {
    return (
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
        Reabrir NC
      </Button>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-3 rounded-md border p-3">
      <input type="hidden" name="ncId" value={ncId} />
      <FormError message={state.error} />

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="reason">Motivo da reabertura</Label>
        <Textarea id="reason" name="reason" required rows={2} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="newDeadline">Novo prazo</Label>
          <Input id="newDeadline" name="newDeadline" type="date" required />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="targetStatus">Voltar para</Label>
          <select
            id="targetStatus"
            name="targetStatus"
            required
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="EM_CORRECAO">Em correção</option>
            <option value="AGUARDANDO_PLANO">Aguardando plano</option>
            <option value="AGUARDANDO_VERIFICACAO">Aguardando verificação</option>
          </select>
        </div>
      </div>

      <div className="flex gap-2">
        <SubmitButton size="sm" variant="destructive">
          Confirmar reabertura
        </SubmitButton>
        <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
