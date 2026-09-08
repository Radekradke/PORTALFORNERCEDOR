"use client";

import { useFormState } from "react-dom";
import { useState } from "react";
import { decideActionPlanAction, type ActionState } from "@/modules/nonconformities/actions/nc-actions";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SubmitButton } from "@/components/ui/submit-button";
import { FormError } from "@/components/ui/form-error";

const initialState: ActionState = {};

/** RF-095: aceitar, rejeitar ou pedir ajuste no plano — sempre com justificativa quando não aceito. */
export function PlanReviewForm({ ncId }: { ncId: string }) {
  const [state, formAction] = useFormState(decideActionPlanAction, initialState);
  const [decision, setDecision] = useState("");

  return (
    <form action={formAction} className="flex flex-col gap-3 rounded-md border p-3">
      <input type="hidden" name="ncId" value={ncId} />
      <FormError message={state.error} />

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="decision">Decisão sobre o plano</Label>
        <select
          id="decision"
          name="decision"
          required
          value={decision}
          onChange={(e) => setDecision(e.target.value)}
          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="" disabled>
            Selecione…
          </option>
          <option value="ACEITO">Aceitar plano</option>
          <option value="AJUSTES_SOLICITADOS">Solicitar ajustes</option>
          <option value="REJEITADO">Rejeitar</option>
        </select>
      </div>

      {decision && decision !== "ACEITO" && (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="reason">Justificativa (obrigatória)</Label>
          <Textarea id="reason" name="reason" required rows={2} />
        </div>
      )}

      <SubmitButton size="sm" className="self-start">
        Registrar decisão
      </SubmitButton>
    </form>
  );
}
