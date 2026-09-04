"use client";

import { useFormState } from "react-dom";
import { scheduleInspectionAction, type ActionState } from "@/modules/inspections/actions/inspection-actions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/ui/submit-button";
import { FormError } from "@/components/ui/form-error";
import { formatCnpj } from "@/lib/cnpj";

const initialState: ActionState = {};

interface Option {
  id: string;
  label: string;
}

export function NewInspectionForm({
  suppliers,
  templates,
  inspectors,
}: {
  suppliers: { id: string; legalName: string; cnpj: string }[];
  templates: Option[];
  inspectors: Option[];
}) {
  const [state, formAction] = useFormState(scheduleInspectionAction, initialState);

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

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="templateId">Checklist</Label>
        <select
          id="templateId"
          name="templateId"
          required
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="">Selecione…</option>
          {templates.map((t) => (
            <option key={t.id} value={t.id}>
              {t.label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="inspectorId">Fiscal responsável (QSMS)</Label>
        <select
          id="inspectorId"
          name="inspectorId"
          required
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="">Selecione…</option>
          {inspectors.map((i) => (
            <option key={i.id} value={i.id}>
              {i.label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="scheduledAt">Data e hora</Label>
        <Input id="scheduledAt" name="scheduledAt" type="datetime-local" required aria-required="true" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="projectOrLocation">Projeto/local (opcional)</Label>
          <Input id="projectOrLocation" name="projectOrLocation" placeholder="Obra Guarulhos — Galpão 3" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="type">Tipo (opcional)</Label>
          <Input id="type" name="type" placeholder="Programada, avulsa, follow-up..." />
        </div>
      </div>

      <SubmitButton className="self-start">Programar fiscalização</SubmitButton>
    </form>
  );
}
