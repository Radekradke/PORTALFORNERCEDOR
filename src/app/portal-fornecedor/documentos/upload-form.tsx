"use client";

import { useFormState } from "react-dom";
import { useState, useRef, useEffect } from "react";
import { uploadDocumentAction, type ActionState } from "@/modules/documents/actions/document-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SubmitButton } from "@/components/ui/submit-button";
import { FormError } from "@/components/ui/form-error";

const initialState: ActionState = {};

export function UploadForm({
  supplierRequirementId,
  validityType,
  needsIssueDate,
  allowedFormats,
}: {
  supplierRequirementId: string;
  validityType: string;
  needsIssueDate: boolean;
  allowedFormats: string[];
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useFormState(uploadDocumentAction, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success) {
      formRef.current?.reset();
      setOpen(false);
    }
  }, [state.success]);

  if (!open) {
    return (
      <Button type="button" size="sm" onClick={() => setOpen(true)}>
        Enviar nova versão
      </Button>
    );
  }

  const accept = (allowedFormats.length > 0 ? allowedFormats : ["PDF", "JPG", "PNG"])
    .map((f) => (f === "PDF" ? "application/pdf" : f === "JPG" ? "image/jpeg" : "image/png"))
    .join(",");

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-3 rounded-md border p-3" noValidate>
      <input type="hidden" name="supplierRequirementId" value={supplierRequirementId} />
      <FormError message={state.error} />

      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`file-${supplierRequirementId}`}>Arquivo (PDF, JPG ou PNG)</Label>
        <input
          id={`file-${supplierRequirementId}`}
          name="file"
          type="file"
          accept={accept}
          required
          className="text-sm"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`documentNumber-${supplierRequirementId}`}>Número do documento</Label>
          <Input id={`documentNumber-${supplierRequirementId}`} name="documentNumber" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`issuer-${supplierRequirementId}`}>Emissor</Label>
          <Input id={`issuer-${supplierRequirementId}`} name="issuer" />
        </div>
      </div>

      {needsIssueDate && (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`issuedAt-${supplierRequirementId}`}>Data de emissão</Label>
          <Input id={`issuedAt-${supplierRequirementId}`} name="issuedAt" type="date" required aria-required="true" />
        </div>
      )}

      {validityType === "INFORMADA" && (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`validUntil-${supplierRequirementId}`}>Data de validade</Label>
          <Input id={`validUntil-${supplierRequirementId}`} name="validUntil" type="date" required aria-required="true" />
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`note-${supplierRequirementId}`}>Observação (opcional)</Label>
        <Textarea id={`note-${supplierRequirementId}`} name="submitterNote" rows={2} />
      </div>

      <div className="flex gap-2">
        <SubmitButton size="sm">Enviar</SubmitButton>
        <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
