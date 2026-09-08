"use client";

import { useFormState } from "react-dom";
import { createNonConformityAction, type ActionState } from "@/modules/nonconformities/actions/nc-actions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SubmitButton } from "@/components/ui/submit-button";
import { FormError } from "@/components/ui/form-error";
import { formatCnpj } from "@/lib/cnpj";

const initialState: ActionState = {};

interface Option {
  id: string;
  label: string;
}

export function NewNcForm({
  suppliers,
  categories,
  responsibles,
}: {
  suppliers: { id: string; legalName: string; cnpj: string }[];
  categories: Option[];
  responsibles: Option[];
}) {
  const [state, formAction] = useFormState(createNonConformityAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <FormError message={state.error} />

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="supplierId">Fornecedor</Label>
        <select
          id="supplierId"
          name="supplierId"
          required
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="">Selecione…</option>
          {suppliers.map((s) => (
            <option key={s.id} value={s.id}>
              {s.legalName} — {formatCnpj(s.cnpj)}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="severity">Gravidade</Label>
          <select
            id="severity"
            name="severity"
            required
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="">Selecione…</option>
            <option value="BAIXA">Baixa (prazo sugerido: 30 dias)</option>
            <option value="MEDIA">Média (prazo sugerido: 15 dias)</option>
            <option value="ALTA">Alta (prazo sugerido: 7 dias)</option>
            <option value="CRITICA">Crítica (prazo sugerido: 1 dia)</option>
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="categoryId">Categoria (opcional)</Label>
          <select
            id="categoryId"
            name="categoryId"
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            defaultValue=""
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
        <Textarea id="description" name="description" required rows={3} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="responsibleInternalId">Responsável interno</Label>
          <select
            id="responsibleInternalId"
            name="responsibleInternalId"
            required
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="">Selecione…</option>
            {responsibles.map((r) => (
              <option key={r.id} value={r.id}>
                {r.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="deadline">Prazo (opcional — usa a sugestão da gravidade se vazio)</Label>
          <Input id="deadline" name="deadline" type="date" />
        </div>
      </div>

      <SubmitButton className="self-start">Criar não conformidade</SubmitButton>
    </form>
  );
}
