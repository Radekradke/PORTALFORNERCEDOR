"use client";

import { useFormState } from "react-dom";
import { toggleCategoryActiveAction, type ActionState } from "@/modules/categories/actions/category-actions";
import { SubmitButton } from "@/components/ui/submit-button";

const initialState: ActionState = {};

export function ToggleCategoryButton({ categoryId, active }: { categoryId: string; active: boolean }) {
  const [, formAction] = useFormState(toggleCategoryActiveAction, initialState);

  return (
    <form action={formAction}>
      <input type="hidden" name="categoryId" value={categoryId} />
      <input type="hidden" name="active" value={(!active).toString()} />
      <SubmitButton size="sm" variant="outline">
        {active ? "Inativar" : "Ativar"}
      </SubmitButton>
    </form>
  );
}
