"use client";

import { useFormState } from "react-dom";
import { useRef, useEffect } from "react";
import { createCategoryAction, type ActionState } from "@/modules/categories/actions/category-actions";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/ui/submit-button";
import { FormError } from "@/components/ui/form-error";

const initialState: ActionState = {};

export function NewCategoryForm() {
  const [state, formAction] = useFormState(createCategoryAction, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success) formRef.current?.reset();
  }, [state.success]);

  return (
    <Card>
      <CardContent className="pt-6">
        <form ref={formRef} action={formAction} className="flex flex-wrap items-end gap-3" noValidate>
          <FormError message={state.error} />
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="code">Código</Label>
            <Input id="code" name="code" placeholder="ELET" required aria-required="true" className="w-32" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name">Nome</Label>
            <Input id="name" name="name" placeholder="Materiais elétricos" required aria-required="true" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="description">Descrição (opcional)</Label>
            <Input id="description" name="description" />
          </div>
          <SubmitButton>Adicionar</SubmitButton>
        </form>
      </CardContent>
    </Card>
  );
}
