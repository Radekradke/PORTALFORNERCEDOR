"use client";

import { useFormState } from "react-dom";
import { useRef, useEffect } from "react";
import type { Category } from "@prisma/client";
import { createChecklistTemplateAction, type ActionState } from "@/modules/inspections/actions/checklist-actions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/ui/submit-button";
import { FormError } from "@/components/ui/form-error";
import { Card, CardContent } from "@/components/ui/card";

const initialState: ActionState = {};

export function NewTemplateForm({ categories }: { categories: Category[] }) {
  const [state, formAction] = useFormState(createChecklistTemplateAction, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success) formRef.current?.reset();
  }, [state.success]);

  return (
    <Card>
      <CardContent className="pt-6">
        <form ref={formRef} action={formAction} className="flex flex-col gap-3" noValidate>
          <FormError message={state.error} />
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="title">Título</Label>
              <Input id="title" name="title" placeholder="Inspeção de segurança em campo" required aria-required="true" />
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
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="description">Descrição (opcional)</Label>
            <Input id="description" name="description" />
          </div>
          <SubmitButton className="self-start">Criar checklist</SubmitButton>
        </form>
      </CardContent>
    </Card>
  );
}
