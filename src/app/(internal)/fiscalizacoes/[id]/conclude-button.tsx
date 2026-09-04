"use client";

import { useFormState } from "react-dom";
import { concludeInspectionAction, type ActionState } from "@/modules/inspections/actions/inspection-actions";
import { SubmitButton } from "@/components/ui/submit-button";
import { FormError } from "@/components/ui/form-error";

const initialState: ActionState = {};

/** RF-078/RF-080: tentar concluir valida no servidor e mostra o(s) item(ns) pendente(s) se houver. */
export function ConcludeButton({ inspectionId }: { inspectionId: string }) {
  const [state, formAction] = useFormState(concludeInspectionAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-2">
      <input type="hidden" name="inspectionId" value={inspectionId} />
      <FormError message={state.error} />
      <SubmitButton>Concluir fiscalização</SubmitButton>
    </form>
  );
}
