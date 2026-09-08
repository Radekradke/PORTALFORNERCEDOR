"use client";

import { useFormState } from "react-dom";
import { submitForVerificationAction, type ActionState } from "@/modules/nonconformities/actions/nc-actions";
import { SubmitButton } from "@/components/ui/submit-button";
import { FormError } from "@/components/ui/form-error";

const initialState: ActionState = {};

export function SubmitForVerificationButton({ ncId }: { ncId: string }) {
  const [state, formAction] = useFormState(submitForVerificationAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-2">
      <input type="hidden" name="ncId" value={ncId} />
      <FormError message={state.error} />
      <SubmitButton>Sinalizar correção concluída</SubmitButton>
    </form>
  );
}
