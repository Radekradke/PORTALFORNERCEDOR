"use client";

import { useFormState } from "react-dom";
import {
  grantPermissionAction,
  revokePermissionAction,
  type ActionState,
} from "@/modules/users-permissions/actions/user-actions";
import { SubmitButton } from "@/components/ui/submit-button";
import { FormError } from "@/components/ui/form-error";

const initialState: ActionState = {};

export function PermissionToggle({
  userId,
  permission,
  granted,
}: {
  userId: string;
  permission: string;
  granted: boolean;
}) {
  const action = granted ? revokePermissionAction : grantPermissionAction;
  const [state, formAction] = useFormState(action, initialState);

  return (
    <form action={formAction} className="flex items-center gap-2">
      <input type="hidden" name="userId" value={userId} />
      <input type="hidden" name="permission" value={permission} />
      <SubmitButton size="sm" variant={granted ? "destructive" : "default"}>
        {granted ? "Revogar" : "Conceder"}
      </SubmitButton>
      {state.error && <FormError message={state.error} />}
    </form>
  );
}
