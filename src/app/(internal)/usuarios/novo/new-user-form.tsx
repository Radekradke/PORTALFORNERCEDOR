"use client";

import { useFormState } from "react-dom";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { createUserAction, type ActionState } from "@/modules/users-permissions/actions/user-actions";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/ui/submit-button";
import { FormError } from "@/components/ui/form-error";

const initialState: ActionState = {};

export function NewUserForm() {
  const [state, formAction] = useFormState(createUserAction, initialState);
  const router = useRouter();

  useEffect(() => {
    if (state.success) {
      router.push("/usuarios");
    }
  }, [state.success, router]);

  return (
    <Card>
      <CardContent className="pt-6">
        <form action={formAction} className="flex flex-col gap-4" noValidate>
          <FormError message={state.error} />

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name">Nome completo</Label>
            <Input id="name" name="name" required aria-required="true" />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">E-mail corporativo</Label>
            <Input id="email" name="email" type="email" required aria-required="true" />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="role">Perfil</Label>
            <select
              id="role"
              name="role"
              required
              aria-required="true"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              defaultValue=""
            >
              <option value="" disabled>
                Selecione...
              </option>
              <option value="ADMIN_TI">Administrador de TI</option>
              <option value="COMPRAS">Suprimentos / Compras</option>
              <option value="QSMS">QSMS</option>
            </select>
          </div>

          <SubmitButton className="mt-2 w-full">Criar e enviar convite</SubmitButton>
        </form>
      </CardContent>
    </Card>
  );
}
