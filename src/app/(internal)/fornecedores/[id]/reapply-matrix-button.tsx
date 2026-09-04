"use client";

import { useFormState } from "react-dom";
import { applyMatrixAction, type ActionState } from "@/modules/requirements/actions/requirement-actions";
import { SubmitButton } from "@/components/ui/submit-button";
import { FormError } from "@/components/ui/form-error";

const initialState: ActionState = {};

export function ReapplyMatrixButton({ supplierId }: { supplierId: string }) {
  const [state, formAction] = useFormState(applyMatrixAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-2 self-start">
      <input type="hidden" name="supplierId" value={supplierId} />
      <FormError message={state.error} />
      <SubmitButton size="sm" variant="outline">
        Reaplicar matriz de requisitos
      </SubmitButton>
    </form>
  );
}
