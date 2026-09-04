"use client";

import { useFormState } from "react-dom";
import { useRef, useEffect, useState } from "react";
import {
  createRequirementTypeAction,
  type ActionState,
} from "@/modules/requirements/actions/requirement-actions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/ui/submit-button";
import { FormError } from "@/components/ui/form-error";
import { Card, CardContent } from "@/components/ui/card";

const initialState: ActionState = {};

export function NewRequirementTypeForm() {
  const [state, formAction] = useFormState(createRequirementTypeAction, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  const [validityType, setValidityType] = useState("SEM_VENCIMENTO");

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
              <Label htmlFor="code">Código</Label>
              <Input id="code" name="code" placeholder="ART" required aria-required="true" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="name">Nome</Label>
              <Input id="name" name="name" placeholder="ART de execução" required aria-required="true" />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="description">Descrição (opcional)</Label>
            <Input id="description" name="description" />
          </div>

          <fieldset className="flex flex-wrap gap-3">
            <legend className="text-sm font-medium">Formatos aceitos (vazio = PDF, JPG e PNG)</legend>
            {["PDF", "JPG", "PNG"].map((format) => (
              <label key={format} className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="allowedFormats" value={format} className="h-4 w-4" />
                {format}
              </label>
            ))}
          </fieldset>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="validityType">Validade</Label>
              <select
                id="validityType"
                name="validityType"
                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                value={validityType}
                onChange={(e) => setValidityType(e.target.value)}
              >
                <option value="SEM_VENCIMENTO">Sem vencimento</option>
                <option value="FIXA">Validade fixa (dias a partir da emissão)</option>
                <option value="INFORMADA">Validade informada no envio</option>
              </select>
            </div>
            {validityType === "FIXA" && (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="validityDays">Dias de validade</Label>
                <Input id="validityDays" name="validityDays" type="number" min={1} required aria-required="true" />
              </div>
            )}
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="needsIssueDate" className="h-4 w-4" />
            Exige data de emissão no envio
          </label>

          <SubmitButton className="self-start">Adicionar tipo de documento</SubmitButton>
        </form>
      </CardContent>
    </Card>
  );
}
