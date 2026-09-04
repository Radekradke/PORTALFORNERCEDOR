"use client";

import { useState } from "react";
import { useFormState } from "react-dom";
import { decideQualificationAction, type ActionState } from "@/modules/qualifications/actions/qualification-actions";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SubmitButton } from "@/components/ui/submit-button";
import { FormError } from "@/components/ui/form-error";

const initialState: ActionState = {};

/** RF-063/RF-064/RF-066: formulário de decisão de qualificação (aprovar, aprovar com ressalvas ou reprovar). */
export function QualificationDecisionForm({
  qualificationId,
  supplierId,
  canApproveNormally,
}: {
  qualificationId: string;
  supplierId: string;
  canApproveNormally: boolean;
}) {
  const [state, formAction] = useFormState(decideQualificationAction, initialState);
  const [result, setResult] = useState<"APROVADO" | "APROVADO_COM_RESSALVAS" | "REPROVADO" | "">("");

  return (
    <form action={formAction} className="flex flex-col gap-4 rounded-md border p-4">
      <input type="hidden" name="qualificationId" value={qualificationId} />
      <input type="hidden" name="supplierId" value={supplierId} />
      <FormError message={state.error} />

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="result">Decisão</Label>
        <select
          id="result"
          name="result"
          required
          value={result}
          onChange={(e) => setResult(e.target.value as typeof result)}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="" disabled>
            Selecione…
          </option>
          <option value="APROVADO" disabled={!canApproveNormally}>
            Aprovado {!canApproveNormally && "(indisponível — requisito obrigatório não atendido)"}
          </option>
          <option value="APROVADO_COM_RESSALVAS">Aprovado com ressalvas</option>
          <option value="REPROVADO">Reprovado</option>
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        {/* id próprio (não "reason"): a mesma página também renderiza o
            formulário de governança, que já usa id="reason" para o motivo
            de mudança de criticidade — ids duplicados quebram a associação
            label/campo (o rótulo e o valor digitado iriam para o campo
            errado). */}
        <Label htmlFor="qualification-reason">Justificativa (obrigatória — RF-063)</Label>
        <Textarea id="qualification-reason" name="reason" required rows={3} />
      </div>

      {result === "APROVADO_COM_RESSALVAS" && (
        <div className="flex flex-col gap-3 rounded-md border border-dashed p-3">
          <p className="text-xs text-muted-foreground">Ressalva (RF-064): condição e prazo são obrigatórios.</p>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="conditionText">Condição</Label>
            <Textarea id="conditionText" name="conditionText" required rows={2} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="conditionDeadline">Prazo</Label>
              <Input id="conditionDeadline" name="conditionDeadline" type="date" required />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="conditionResponsible">Responsável</Label>
              <Input id="conditionResponsible" name="conditionResponsible" placeholder="Opcional" />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="conditionEffect">Efeito operacional</Label>
            <Input id="conditionEffect" name="conditionEffect" placeholder="Opcional" />
          </div>
        </div>
      )}

      <SubmitButton className="self-start">Registrar decisão</SubmitButton>
    </form>
  );
}
