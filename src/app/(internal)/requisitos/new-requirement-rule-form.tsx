"use client";

import { useFormState } from "react-dom";
import { useRef, useEffect } from "react";
import type { Category, RequirementType } from "@prisma/client";
import {
  createRequirementRuleAction,
  type ActionState,
} from "@/modules/requirements/actions/requirement-actions";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/ui/submit-button";
import { FormError } from "@/components/ui/form-error";
import { Card, CardContent } from "@/components/ui/card";

const initialState: ActionState = {};

export function NewRequirementRuleForm({
  types,
  categories,
}: {
  types: RequirementType[];
  categories: Category[];
}) {
  const [state, formAction] = useFormState(createRequirementRuleAction, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success) formRef.current?.reset();
  }, [state.success]);

  if (types.length === 0 || categories.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Cadastre ao menos um tipo de documento ativo e uma categoria antes de criar uma regra.
      </p>
    );
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <form ref={formRef} action={formAction} className="flex flex-col gap-3" noValidate>
          <FormError message={state.error} />

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="categoryId">Categoria</Label>
              <select
                id="categoryId"
                name="categoryId"
                required
                aria-required="true"
                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                defaultValue=""
              >
                <option value="" disabled>
                  Selecione...
                </option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="requirementTypeId">Tipo de documento</Label>
              <select
                id="requirementTypeId"
                name="requirementTypeId"
                required
                aria-required="true"
                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                defaultValue=""
              >
                <option value="" disabled>
                  Selecione...
                </option>
                {types.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <fieldset className="flex flex-wrap gap-3">
            <legend className="text-sm font-medium">Criticidade</legend>
            {["BAIXA", "MEDIA", "ALTA", "CRITICA"].map((c) => (
              <label key={c} className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="criticalities" value={c} className="h-4 w-4" />
                {c.charAt(0) + c.slice(1).toLowerCase()}
              </label>
            ))}
          </fieldset>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="obligation">Obrigatoriedade</Label>
            <select
              id="obligation"
              name="obligation"
              required
              aria-required="true"
              className="h-10 w-56 rounded-md border border-input bg-background px-3 text-sm"
              defaultValue="OBRIGATORIO"
            >
              <option value="OBRIGATORIO">Obrigatório</option>
              <option value="CONDICIONAL">Condicional</option>
              <option value="INFORMATIVO">Informativo</option>
            </select>
          </div>

          <SubmitButton className="self-start">Adicionar regra</SubmitButton>
        </form>
      </CardContent>
    </Card>
  );
}
