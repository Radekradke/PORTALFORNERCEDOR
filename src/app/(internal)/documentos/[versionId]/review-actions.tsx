"use client";

import { useFormState } from "react-dom";
import { useState } from "react";
import {
  startReviewAction,
  approveDocumentAction,
  rejectDocumentAction,
  type ActionState,
} from "@/modules/documents/actions/document-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SubmitButton } from "@/components/ui/submit-button";
import { FormError } from "@/components/ui/form-error";

const initialState: ActionState = {};

function toDateInputValue(date: Date | string | null): string {
  if (!date) return "";
  return new Date(date).toISOString().slice(0, 10);
}

export function ReviewActions({
  versionId,
  status,
  currentValidUntil,
}: {
  versionId: string;
  status: string;
  currentValidUntil: Date | string | null;
}) {
  const [startState, startAction] = useFormState(startReviewAction, initialState);
  const [approveState, approveAction] = useFormState(approveDocumentAction, initialState);
  const [rejectState, rejectAction] = useFormState(rejectDocumentAction, initialState);
  const [showReject, setShowReject] = useState(false);

  if (!["ENVIADO", "EM_ANALISE"].includes(status)) {
    return <p className="text-sm text-muted-foreground">Este documento já foi decidido.</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      {status === "ENVIADO" && (
        <form action={startAction}>
          <input type="hidden" name="versionId" value={versionId} />
          <FormError message={startState.error} />
          <SubmitButton variant="outline" size="sm">
            Iniciar análise
          </SubmitButton>
        </form>
      )}

      <form action={approveAction} className="flex flex-col gap-2 rounded-md border p-3">
        <p className="text-sm font-medium">Aprovar</p>
        <input type="hidden" name="versionId" value={versionId} />
        <FormError message={approveState.error} />
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="validUntilOverride">Confirmar validade efetiva (opcional)</Label>
          <Input
            id="validUntilOverride"
            name="validUntilOverride"
            type="date"
            defaultValue={toDateInputValue(currentValidUntil)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="approve-reason">Parecer (opcional)</Label>
          <Textarea id="approve-reason" name="reason" rows={2} />
        </div>
        <SubmitButton className="self-start" size="sm">
          Aprovar documento
        </SubmitButton>
      </form>

      {!showReject ? (
        <Button type="button" variant="destructive" size="sm" className="self-start" onClick={() => setShowReject(true)}>
          Rejeitar
        </Button>
      ) : (
        <form action={rejectAction} className="flex flex-col gap-2 rounded-md border p-3">
          <p className="text-sm font-medium">Rejeitar</p>
          <input type="hidden" name="versionId" value={versionId} />
          <FormError message={rejectState.error} />
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="reject-reason">Motivo (visível ao fornecedor — RN-009)</Label>
            <Textarea id="reject-reason" name="reason" required rows={2} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="internalNote">Observação interna (opcional, nunca visível ao fornecedor)</Label>
            <Textarea id="internalNote" name="internalNote" rows={2} />
          </div>
          <div className="flex gap-2">
            <SubmitButton variant="destructive" size="sm">
              Confirmar rejeição
            </SubmitButton>
            <Button type="button" variant="ghost" size="sm" onClick={() => setShowReject(false)}>
              Cancelar
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
