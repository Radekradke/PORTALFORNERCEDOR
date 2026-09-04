"use client";

import { useFormState } from "react-dom";
import {
  addResponsibleAction,
  removeResponsibleAction,
  type ActionState,
} from "@/modules/suppliers/actions/supplier-actions";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/submit-button";
import { FormError } from "@/components/ui/form-error";
import { RESPONSIBLE_TYPE_LABELS } from "@/components/layout/nav-config";

const initialState: ActionState = {};

interface ResponsibleRow {
  id: string;
  type: string;
  user: { id: string; name: string; email: string };
}

export function ResponsiblesSection({
  supplierId,
  responsibles,
  assignableUsers,
}: {
  supplierId: string;
  responsibles: ResponsibleRow[];
  assignableUsers: { id: string; name: string; email: string; role: string }[];
}) {
  const [addState, addAction] = useFormState(addResponsibleAction, initialState);
  const [, removeAction] = useFormState(removeResponsibleAction, initialState);

  return (
    <div className="flex flex-col gap-3">
      {responsibles.length === 0 && (
        <p className="text-sm text-muted-foreground">Nenhum responsável interno vinculado ainda.</p>
      )}
      <ul className="flex flex-col gap-2">
        {responsibles.map((r) => (
          <li key={r.id} className="flex items-center justify-between rounded-md border p-2 text-sm">
            <span>
              <strong>{RESPONSIBLE_TYPE_LABELS[r.type] ?? r.type}:</strong> {r.user.name} ({r.user.email})
            </span>
            <form action={removeAction}>
              <input type="hidden" name="supplierId" value={supplierId} />
              <input type="hidden" name="responsibleId" value={r.id} />
              <Button type="submit" size="sm" variant="ghost">
                Remover
              </Button>
            </form>
          </li>
        ))}
      </ul>

      <form action={addAction} className="flex flex-wrap items-end gap-3 border-t pt-3">
        <input type="hidden" name="supplierId" value={supplierId} />
        <FormError message={addState.error} />
        <div className="flex flex-col gap-1.5">
          <label htmlFor="userId" className="text-xs font-medium">
            Usuário
          </label>
          <select
            id="userId"
            name="userId"
            required
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            defaultValue=""
          >
            <option value="" disabled>
              Selecione...
            </option>
            {assignableUsers.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name} ({user.role})
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="type" className="text-xs font-medium">
            Papel
          </label>
          <select
            id="type"
            name="type"
            required
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            defaultValue=""
          >
            <option value="" disabled>
              Selecione...
            </option>
            <option value="COMPRADOR">Comprador</option>
            <option value="GESTOR_CONTRATO">Gestor do contrato</option>
            <option value="FISCAL">Fiscal</option>
          </select>
        </div>
        <SubmitButton size="sm">Adicionar</SubmitButton>
      </form>
    </div>
  );
}
