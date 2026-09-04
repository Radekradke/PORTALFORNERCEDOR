"use client";

import { useFormState } from "react-dom";
import { useState } from "react";
import type { ButtonProps } from "@/components/ui/button";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { SubmitButton } from "@/components/ui/submit-button";
import { FormError } from "@/components/ui/form-error";

export interface ReasonActionState {
  error?: string;
  success?: boolean;
}

/**
 * Botão que expande um formulário com campo de motivo antes de confirmar uma
 * decisão sensível (validar, rejeitar, solicitar ajustes, suspender,
 * bloquear, desbloquear, inativar, reativar). Todas essas ações pedem
 * confirmação e, quando aplicável, justificativa (diretrizes de experiência).
 */
export function ReasonActionButton({
  action,
  hiddenFields,
  label,
  confirmLabel = "Confirmar",
  variant = "outline",
  requireReason = true,
  reasonLabel = "Motivo",
}: {
  action: (state: ReasonActionState, formData: FormData) => Promise<ReasonActionState>;
  hiddenFields: Record<string, string>;
  label: string;
  confirmLabel?: string;
  variant?: ButtonProps["variant"];
  requireReason?: boolean;
  reasonLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useFormState(action, {});

  if (!open) {
    return (
      <Button type="button" variant={variant} size="sm" onClick={() => setOpen(true)}>
        {label}
      </Button>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-2 rounded-md border p-3">
      {Object.entries(hiddenFields).map(([key, value]) => (
        <input key={key} type="hidden" name={key} value={value} />
      ))}
      <FormError message={state.error} />
      {requireReason && (
        <>
          <label className="text-xs font-medium" htmlFor={`reason-${label}`}>
            {reasonLabel}
          </label>
          <Textarea id={`reason-${label}`} name="reason" required rows={2} />
        </>
      )}
      <div className="flex gap-2">
        <SubmitButton size="sm" variant={variant}>
          {confirmLabel}
        </SubmitButton>
        <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
