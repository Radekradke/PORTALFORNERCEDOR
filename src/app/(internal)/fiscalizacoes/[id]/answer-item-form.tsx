"use client";

import { useFormState } from "react-dom";
import { useState } from "react";
import { saveAnswerAction, type ActionState } from "@/modules/inspections/actions/inspection-actions";
import { Textarea } from "@/components/ui/textarea";
import { SubmitButton } from "@/components/ui/submit-button";
import { FormError } from "@/components/ui/form-error";
import { InspectionResponseBadge } from "@/components/layout/status-badges";
import { INSPECTION_RESPONSE_LABELS } from "@/components/layout/nav-config";
import { cn } from "@/lib/utils";

const initialState: ActionState = {};

export interface ItemSnapshot {
  id: string;
  text: string;
  guidance?: string | null;
  allowedResponses: string[];
  evidenceRequiredOn: string[];
  observationRequiredOn: string[];
}

export interface ExistingAnswer {
  response: string | null;
  observation: string | null;
  evidences: { id: string; originalName: string }[];
}

/** RF-076/RF-077: um item por formulário — respostas em botões grandes (alvo de toque mobile-first). */
export function AnswerItemForm({
  inspectionId,
  item,
  existingAnswer,
}: {
  inspectionId: string;
  item: ItemSnapshot;
  existingAnswer?: ExistingAnswer;
}) {
  const [state, formAction] = useFormState(saveAnswerAction, initialState);
  const [response, setResponse] = useState(existingAnswer?.response ?? "");

  const evidenceRequired = response ? item.evidenceRequiredOn.includes(response) : false;
  const observationRequired = response ? item.observationRequiredOn.includes(response) : false;

  return (
    <form action={formAction} className="flex flex-col gap-3 rounded-md border p-3">
      <input type="hidden" name="inspectionId" value={inspectionId} />
      <input type="hidden" name="itemId" value={item.id} />
      <input type="hidden" name="response" value={response} />

      <div>
        <p className="font-medium">{item.text}</p>
        {item.guidance && <p className="text-xs text-muted-foreground">{item.guidance}</p>}
      </div>

      <FormError message={state.error} />

      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={`Resposta: ${item.text}`}>
        {item.allowedResponses.map((r) => (
          <button
            key={r}
            type="button"
            aria-pressed={response === r}
            onClick={() => setResponse(r)}
            className={cn(
              "min-h-11 rounded-md border px-3 py-2 text-sm font-medium",
              response === r ? "border-primary bg-primary text-primary-foreground" : "border-input bg-background",
            )}
          >
            {INSPECTION_RESPONSE_LABELS[r] ?? r}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium" htmlFor={`observation-${item.id}`}>
          Observação {observationRequired && "(obrigatória para esta resposta)"}
        </label>
        <Textarea
          id={`observation-${item.id}`}
          name="observation"
          defaultValue={existingAnswer?.observation ?? ""}
          rows={2}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium" htmlFor={`file-${item.id}`}>
          Foto ou arquivo {evidenceRequired && "(obrigatório para esta resposta)"}
        </label>
        <input id={`file-${item.id}`} name="file" type="file" accept="image/jpeg,image/png,application/pdf" capture="environment" className="text-sm" />
      </div>

      {existingAnswer && existingAnswer.evidences.length > 0 && (
        <div className="flex flex-col gap-1 text-xs">
          <p className="text-muted-foreground">Evidências já enviadas:</p>
          {existingAnswer.evidences.map((e) => (
            <a
              key={e.id}
              href={`/api/evidencias/${e.id}/download`}
              target="_blank"
              rel="noreferrer"
              className="text-primary underline underline-offset-4"
            >
              {e.originalName}
            </a>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2">
        <SubmitButton size="sm" disabled={!response}>
          Salvar resposta
        </SubmitButton>
        {existingAnswer?.response && <InspectionResponseBadge response={existingAnswer.response} />}
      </div>
    </form>
  );
}
