"use client";

import { useFormState } from "react-dom";
import { setChecklistTemplateActiveAction, type ActionState } from "@/modules/inspections/actions/checklist-actions";
import { SubmitButton } from "@/components/ui/submit-button";

const initialState: ActionState = {};

export function ToggleTemplateButton({ templateId, active }: { templateId: string; active: boolean }) {
  const [, formAction] = useFormState(setChecklistTemplateActiveAction, initialState);
  return (
    <form action={formAction}>
      <input type="hidden" name="templateId" value={templateId} />
      <input type="hidden" name="active" value={(!active).toString()} />
      <SubmitButton size="sm" variant="outline">
        {active ? "Inativar" : "Ativar"}
      </SubmitButton>
    </form>
  );
}
