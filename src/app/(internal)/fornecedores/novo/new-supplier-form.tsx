"use client";

import { useFormState } from "react-dom";
import type { Category } from "@prisma/client";
import { createSupplierAction, type ActionState } from "@/modules/suppliers/actions/supplier-actions";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/ui/submit-button";
import { FormError } from "@/components/ui/form-error";

const initialState: ActionState = {};

export function NewSupplierForm({ categories }: { categories: Category[] }) {
  const [state, formAction] = useFormState(createSupplierAction, initialState);

  return (
    <Card>
      <CardContent className="pt-6">
        <form action={formAction} className="flex flex-col gap-4" noValidate>
          <FormError message={state.error} />

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cnpj">CNPJ</Label>
            <Input id="cnpj" name="cnpj" placeholder="00.000.000/0000-00" required aria-required="true" />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="legalName">Razão social</Label>
            <Input id="legalName" name="legalName" required aria-required="true" />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="tradeName">Nome fantasia (opcional)</Label>
            <Input id="tradeName" name="tradeName" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="contactName">Contato principal</Label>
              <Input id="contactName" name="contactName" required aria-required="true" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="contactEmail">E-mail do contato</Label>
              <Input id="contactEmail" name="contactEmail" type="email" required aria-required="true" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="criticality">Criticidade proposta</Label>
              <select
                id="criticality"
                name="criticality"
                required
                aria-required="true"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                defaultValue=""
              >
                <option value="" disabled>
                  Selecione...
                </option>
                <option value="BAIXA">Baixa</option>
                <option value="MEDIA">Média</option>
                <option value="ALTA">Alta</option>
                <option value="CRITICA">Crítica</option>
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="supplyType">Fornecimento (opcional)</Label>
              <select
                id="supplyType"
                name="supplyType"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                defaultValue=""
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
                <input type="checkbox" name="categoryIds" value={category.id} className="h-4 w-4" />
                {category.name}
              </label>
            ))}
          </fieldset>

          <SubmitButton className="mt-2 w-full">Criar e enviar convite</SubmitButton>
        </form>
      </CardContent>
    </Card>
  );
}
