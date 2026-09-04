"use client";

import { useFormState } from "react-dom";
import type { Category } from "@prisma/client";
import { updateGovernanceAction, type ActionState } from "@/modules/suppliers/actions/supplier-actions";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SubmitButton } from "@/components/ui/submit-button";
import { FormError } from "@/components/ui/form-error";

const initialState: ActionState = {};

export function GovernanceForm({
  supplierId,
  criticality,
  supplyType,
  categories,
  selectedCategoryIds,
}: {
  supplierId: string;
  criticality: string | null;
  supplyType: string | null;
  categories: Category[];
  selectedCategoryIds: string[];
}) {
  const [state, formAction] = useFormState(updateGovernanceAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="supplierId" value={supplierId} />
      <FormError message={state.error} />

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="criticality">Criticidade</Label>
          <select
            id="criticality"
            name="criticality"
            defaultValue={criticality ?? ""}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="">Não definida</option>
            <option value="BAIXA">Baixa</option>
            <option value="MEDIA">Média</option>
            <option value="ALTA">Alta</option>
            <option value="CRITICA">Crítica</option>
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="supplyType">Fornecimento</Label>
          <select
            id="supplyType"
            name="supplyType"
            defaultValue={supplyType ?? ""}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="">Não definido</option>
            <option value="MATERIAL">Material</option>
            <option value="SERVICO">Serviço</option>
            <option value="AMBOS">Material e serviço</option>
          </select>
        </div>
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-medium">Categorias</legend>
        {categories.map((category) => (
          <label key={category.id} className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="categoryIds"
              value={category.id}
              defaultChecked={selectedCategoryIds.includes(category.id)}
              className="h-4 w-4"
            />
            {category.name}
          </label>
        ))}
      </fieldset>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="reason">Motivo (obrigatório se mudar a criticidade — RN-003)</Label>
        <Textarea id="reason" name="reason" rows={2} />
      </div>

      <SubmitButton className="self-start">Salvar governança</SubmitButton>
    </form>
  );
}
