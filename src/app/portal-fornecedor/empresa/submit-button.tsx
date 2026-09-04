"use client";

import { useFormState } from "react-dom";
import { submitForAnalysisAction, type ActionState } from "@/modules/suppliers/actions/supplier-actions";
import { SubmitButton } from "@/components/ui/submit-button";
import { FormError } from "@/components/ui/form-error";

const initialState: ActionState = {};

export function SubmitForAnalysisButton({ supplierId }: { supplierId: string }) {
  const [state, formAction] = useFormState(submitForAnalysisAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-2">
      <input type="hidden" name="supplierId" value={supplierId} />
      <FormError message={state.error} />
      <SubmitButton>Enviar cadastro para análise</SubmitButton>
      <p className="text-xs text-muted-foreground">
        Confira se a razão social, o endereço completo e ao menos um contato estão preenchidos.
      </p>
    </form>
  );
}
