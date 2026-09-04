"use client";

import { useFormState } from "react-dom";
import { useRef, useEffect } from "react";
import {
  addContactAction,
  deactivateContactAction,
  type ActionState,
} from "@/modules/suppliers/actions/supplier-actions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/submit-button";
import { FormError } from "@/components/ui/form-error";
import { CONTACT_TYPE_LABELS } from "@/components/layout/nav-config";

const initialState: ActionState = {};

interface ContactRow {
  id: string;
  name: string;
  role: string | null;
  email: string | null;
  phone: string | null;
  contactType: string;
  isPrimary: boolean;
}

export function ContactsForm({ supplierId, contacts, canEdit }: { supplierId: string; contacts: ContactRow[]; canEdit: boolean }) {
  const [addState, addAction] = useFormState(addContactAction, initialState);
  const [, removeAction] = useFormState(deactivateContactAction, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (addState.success) formRef.current?.reset();
  }, [addState.success]);

  return (
    <div className="flex flex-col gap-3">
      <ul className="flex flex-col gap-2">
        {contacts.map((contact) => (
          <li key={contact.id} className="flex items-center justify-between rounded-md border p-2 text-sm">
            <span>
              <strong>{contact.name}</strong>
              {contact.isPrimary && <span className="ml-1 text-xs text-primary">(principal)</span>}
              <br />
              <span className="text-xs text-muted-foreground">
                {CONTACT_TYPE_LABELS[contact.contactType]} · {contact.email ?? "sem e-mail"} ·{" "}
                {contact.phone ?? "sem telefone"}
              </span>
            </span>
            {canEdit && (
              <form action={removeAction}>
                <input type="hidden" name="supplierId" value={supplierId} />
                <input type="hidden" name="contactId" value={contact.id} />
                <Button type="submit" size="sm" variant="ghost">
                  Remover
                </Button>
              </form>
            )}
          </li>
        ))}
      </ul>

      {canEdit && (
        <form ref={formRef} action={addAction} className="flex flex-col gap-3 border-t pt-3">
          <input type="hidden" name="supplierId" value={supplierId} />
          <FormError message={addState.error} />
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="name">Nome</Label>
              <Input id="name" name="name" required aria-required="true" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="role">Cargo</Label>
              <Input id="role" name="role" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" name="email" type="email" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="phone">Telefone</Label>
              <Input id="phone" name="phone" />
            </div>
          </div>
          <div className="flex items-end gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="contactType">Tipo</Label>
              <select
                id="contactType"
                name="contactType"
                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                defaultValue="OUTRO"
              >
                {Object.entries(CONTACT_TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <label className="flex items-center gap-2 pb-2 text-sm">
              <input type="checkbox" name="isPrimary" className="h-4 w-4" />
              Contato principal
            </label>
            <SubmitButton size="sm">Adicionar contato</SubmitButton>
          </div>
        </form>
      )}
    </div>
  );
}
