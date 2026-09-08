"use client";

import { useFormState } from "react-dom";
import { updateNonConformityDraftAction, type ActionState } from "@/modules/nonconformities/actions/nc-actions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SubmitButton } from "@/components/ui/submit-button";
import { FormError } from "@/components/ui/form-error";

const initialState: ActionState = {};

interface Option {
  id: string;
  label: string;
}

/** RF-090/CA-14: rascunho automático — QSMS confirma/ajusta antes de abrir ao fornecedor. */
export function DraftEditForm({
  ncId,
  severity,
  categoryId,
  description,
  responsibleInternalId,
  deadline,
  categories,
  responsibles,
}: {
  ncId: string;
  severity: string;
  categoryId: string | null;
  description: string;
  responsibleInternalId: string;
  deadline: string;
  categories: Option[];
  responsibles: Option[];
}) {
  const [state, formAction] = useFormState(updateNonConformityDraftAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-3 rounded-md border border-dashed p-3">
      <input type="hidden" name="ncId" value={ncId} />
      <FormError message={state.error} />

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="severity">Gravidade</Label>
          <select
            id="severity"
            name="severity"
            defaultValue={severity}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="BAIXA">Baixa</option>
            <option value="MEDIA">Média</option>
            <option value="ALTA">Alta</option>
            <option value="CRITICA">Crítica</option>
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="categoryId">Categoria</Label>
          <select
            id="categoryId"
            name="categoryId"
            defaultValue={categoryId ?? ""}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="">Nenhuma</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="description">Descrição</Label>
        <Textarea id="description" name="description" defaultValue={description} rows={3} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="responsibleInternalId">Responsável interno</Label>
          <select
            id="responsibleInternalId"
            name="responsibleInternalId"
            defaultValue={responsibleInternalId}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          >
            {responsibles.map((r) => (
              <option key={r.id} value={r.id}>
                {r.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="deadline">Prazo</Label>
          <Input id="deadline" name="deadline" type="date" defaultValue={deadline} />
        </div>
      </div>

      <SubmitButton size="sm" className="self-start">
        Salvar ajustes do rascunho
      </SubmitButton>
    </form>
  );
}
