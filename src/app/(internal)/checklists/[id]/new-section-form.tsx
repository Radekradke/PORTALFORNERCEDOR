"use client";

import { useFormState } from "react-dom";
import { useRef, useEffect } from "react";
import { addChecklistSectionAction, type ActionState } from "@/modules/inspections/actions/checklist-actions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/ui/submit-button";
import { FormError } from "@/components/ui/form-error";

const initialState: ActionState = {};

export function NewSectionForm({ templateId }: { templateId: string }) {
  const [state, formAction] = useFormState(addChecklistSectionAction, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success) formRef.current?.reset();
  }, [state.success]);

  return (
    <form ref={formRef} action={formAction} className="flex flex-wrap items-end gap-3 rounded-md border p-3" noValidate>
      <input type="hidden" name="templateId" value={templateId} />
      <FormError message={state.error} />
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="section-title">Nova seção</Label>
        <Input id="section-title" name="title" placeholder="Ex.: EPIs e sinalização" required aria-required="true" />
      </div>
      <SubmitButton size="sm">Adicionar seção</SubmitButton>
    </form>
  );
}
