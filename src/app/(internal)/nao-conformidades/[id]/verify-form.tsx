"use client";

import { useFormState } from "react-dom";
import { useState } from "react";
import { verifyCorrectionAction, type ActionState } from "@/modules/nonconformities/actions/nc-actions";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SubmitButton } from "@/components/ui/submit-button";
import { FormError } from "@/components/ui/form-error";

const initialState: ActionState = {};

/** RF-096: verificação remota ou presencial e decisão final (aprovar/encerrar ou devolver). */
export function VerifyForm({ ncId }: { ncId: string }) {
  const [state, formAction] = useFormState(verifyCorrectionAction, initialState);
  const [decision, setDecision] = useState("");

  return (
    <form action={formAction} className="flex flex-col gap-3 rounded-md border p-3">
      <input type="hidden" name="ncId" value={ncId} />
      <FormError message={state.error} />

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="method">Método</Label>
          <select id="method" name="method" required className="h-10 rounded-md border border-input bg-background px-3 text-sm">
            <option value="">Selecione…</option>
            <option value="REMOTA">Remota</option>
            <option value="PRESENCIAL">Presencial</option>
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="decision">Decisão</Label>
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
            <option value="APROVADA">Aprovar e encerrar</option>
            <option value="REJEITADA">Devolver para correção</option>
          </select>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="note">
          Nota da verificação {decision === "REJEITADA" && "(obrigatória — orientação para o fornecedor)"}
        </Label>
        <Textarea id="note" name="note" required={decision === "REJEITADA"} rows={2} />
      </div>

      <SubmitButton size="sm" className="self-start">
        Registrar verificação
      </SubmitButton>
    </form>
  );
}
