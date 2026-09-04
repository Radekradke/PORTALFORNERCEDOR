"use client";

import { useFormState } from "react-dom";
import {
  toggleRequirementTypeActiveAction,
  toggleRequirementRuleActiveAction,
  type ActionState,
} from "@/modules/requirements/actions/requirement-actions";
import { SubmitButton } from "@/components/ui/submit-button";

const initialState: ActionState = {};

export function ToggleTypeButton({ id, active }: { id: string; active: boolean }) {
  const [, formAction] = useFormState(toggleRequirementTypeActiveAction, initialState);
  return (
    <form action={formAction}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="active" value={(!active).toString()} />
      <SubmitButton size="sm" variant="outline">
        {active ? "Inativar" : "Ativar"}
      </SubmitButton>
    </form>
  );
}

export function ToggleRuleButton({ id, active }: { id: string; active: boolean }) {
  const [, formAction] = useFormState(toggleRequirementRuleActiveAction, initialState);
  return (
    <form action={formAction}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="active" value={(!active).toString()} />
      <SubmitButton size="sm" variant="outline">
        {active ? "Inativar" : "Ativar"}
      </SubmitButton>
    </form>
  );
}
