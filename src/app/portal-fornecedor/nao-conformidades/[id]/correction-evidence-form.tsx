"use client";

import { useFormState } from "react-dom";
import { useRef, useEffect } from "react";
import { addCorrectionEvidenceAction, type ActionState } from "@/modules/nonconformities/actions/nc-actions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/ui/submit-button";
import { FormError } from "@/components/ui/form-error";

const initialState: ActionState = {};

/** Fluxo 6.3: "durante a correção, o fornecedor adiciona evidências de execução sem apagar as anteriores." */
export function CorrectionEvidenceForm({ ncId }: { ncId: string }) {
  const [state, formAction] = useFormState(addCorrectionEvidenceAction, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success) formRef.current?.reset();
  }, [state.success]);

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-3 rounded-md border border-dashed p-3">
      <input type="hidden" name="ncId" value={ncId} />
      <FormError message={state.error} />
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="description">Descrição da evidência (opcional)</Label>
        <Input id="description" name="description" />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="file">Foto ou arquivo</Label>
        <input id="file" name="file" type="file" accept="image/jpeg,image/png,application/pdf" capture="environment" className="text-sm" />
      </div>
      <SubmitButton size="sm" className="self-start">
        Anexar evidência
      </SubmitButton>
    </form>
  );
}
