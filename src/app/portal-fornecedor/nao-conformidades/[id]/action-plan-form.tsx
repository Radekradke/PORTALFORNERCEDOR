"use client";

import { useFormState } from "react-dom";
import { saveActionPlanAction, type ActionState } from "@/modules/nonconformities/actions/nc-actions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SubmitButton } from "@/components/ui/submit-button";
import { FormError } from "@/components/ui/form-error";

const initialState: ActionState = {};

/** RF-094: causa, ação corretiva, responsável e prazo — com rascunho e envio. */
export function ActionPlanForm({
  ncId,
  cause,
  correctiveAction,
  responsibleName,
  proposedDeadline,
}: {
  ncId: string;
  cause?: string | null;
  correctiveAction?: string | null;
  responsibleName?: string | null;
  proposedDeadline?: string | null;
}) {
  const [state, formAction] = useFormState(saveActionPlanAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="ncId" value={ncId} />
      <FormError message={state.error} />

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="cause">Causa</Label>
        <Textarea id="cause" name="cause" defaultValue={cause ?? ""} rows={2} />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="correctiveAction">Ação corretiva</Label>
        <Textarea id="correctiveAction" name="correctiveAction" defaultValue={correctiveAction ?? ""} rows={2} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="responsibleName">Responsável pela correção</Label>
          <Input id="responsibleName" name="responsibleName" defaultValue={responsibleName ?? ""} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="proposedDeadline">Prazo proposto</Label>
          <Input id="proposedDeadline" name="proposedDeadline" type="date" defaultValue={proposedDeadline ?? ""} />
        </div>
      </div>

      <div className="flex gap-2">
        <SubmitButton name="intent" value="draft" variant="outline">
          Salvar rascunho
        </SubmitButton>
        <SubmitButton name="intent" value="submit">
          Enviar plano
        </SubmitButton>
      </div>
    </form>
  );
}
