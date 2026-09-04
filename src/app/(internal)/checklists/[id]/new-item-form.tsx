"use client";

import { useFormState } from "react-dom";
import { useRef, useEffect, useState } from "react";
import { addChecklistItemAction, type ActionState } from "@/modules/inspections/actions/checklist-actions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/submit-button";
import { FormError } from "@/components/ui/form-error";
import { INSPECTION_RESPONSE_LABELS, CRITICALITY_LABELS } from "@/components/layout/nav-config";

const initialState: ActionState = {};
const RESPONSES = ["CONFORME", "CONFORME_COM_RESSALVA", "NAO_CONFORME", "NAO_APLICAVEL"] as const;

/** RF-070 a RF-073: item de checklist com respostas permitidas e regras de evidência/observação por resposta. */
export function NewItemForm({ templateId, sectionId }: { templateId: string; sectionId: string }) {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useFormState(addChecklistItemAction, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  const [generatesNc, setGeneratesNc] = useState(false);

  useEffect(() => {
    if (state.success) {
      formRef.current?.reset();
      setGeneratesNc(false);
    }
  }, [state.success]);

  if (!open) {
    return (
      <Button type="button" size="sm" variant="outline" onClick={() => setOpen(true)}>
        Adicionar item
      </Button>
    );
  }

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-3 rounded-md border border-dashed p-3" noValidate>
      <input type="hidden" name="templateId" value={templateId} />
      <input type="hidden" name="sectionId" value={sectionId} />
      <FormError message={state.error} />

      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`text-${sectionId}`}>Texto do item</Label>
        <Input id={`text-${sectionId}`} name="text" placeholder="Uso correto de EPI" required aria-required="true" />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`guidance-${sectionId}`}>Orientação de preenchimento (opcional)</Label>
        <Textarea id={`guidance-${sectionId}`} name="guidance" rows={2} />
      </div>

      <fieldset className="flex flex-wrap gap-3">
        <legend className="text-sm font-medium">Respostas permitidas</legend>
        {RESPONSES.map((r) => (
          <label key={r} className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="allowedResponses" value={r} defaultChecked className="h-4 w-4" />
            {INSPECTION_RESPONSE_LABELS[r]}
          </label>
        ))}
      </fieldset>

      <fieldset className="flex flex-wrap gap-3">
        <legend className="text-sm font-medium">Exige evidência (foto/arquivo) quando a resposta for</legend>
        {RESPONSES.map((r) => (
          <label key={r} className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="evidenceRequiredOn"
              value={r}
              defaultChecked={r === "NAO_CONFORME"}
              className="h-4 w-4"
            />
            {INSPECTION_RESPONSE_LABELS[r]}
          </label>
        ))}
      </fieldset>

      <fieldset className="flex flex-wrap gap-3">
        <legend className="text-sm font-medium">Exige observação (justificativa) quando a resposta for</legend>
        {RESPONSES.map((r) => (
          <label key={r} className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="observationRequiredOn"
              value={r}
              defaultChecked={r === "NAO_CONFORME" || r === "NAO_APLICAVEL"}
              className="h-4 w-4"
            />
            {INSPECTION_RESPONSE_LABELS[r]}
          </label>
        ))}
      </fieldset>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="generatesNonConformity"
          checked={generatesNc}
          onChange={(e) => setGeneratesNc(e.target.checked)}
          className="h-4 w-4"
        />
        Sugere criação de não conformidade quando não conforme (RF-073)
      </label>

      {generatesNc && (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`severity-${sectionId}`}>Gravidade padrão sugerida</Label>
          <select
            id={`severity-${sectionId}`}
            name="defaultSeverity"
            className="h-10 w-48 rounded-md border border-input bg-background px-3 text-sm"
            defaultValue="MEDIA"
          >
            {Object.entries(CRITICALITY_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="flex gap-2">
        <SubmitButton size="sm">Salvar item</SubmitButton>
        <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
