"use client";

import { useFormState } from "react-dom";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  resetPasswordAction,
  type ResetPasswordState,
} from "@/modules/auth-access/actions/password-actions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/ui/submit-button";
import { FormError } from "@/components/ui/form-error";
import { Alert, AlertDescription } from "@/components/ui/alert";

const initialState: ResetPasswordState = {};

export function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [state, formAction] = useFormState(resetPasswordAction, initialState);

  if (state.success) {
    return (
      <Alert variant="success">
        <AlertDescription>
          Senha definida com sucesso.{" "}
          <Link href="/login" className="underline underline-offset-4">
            Entrar agora
          </Link>
          .
        </AlertDescription>
      </Alert>
    );
  }

  if (!token) {
    return (
      <FormError message="Link inválido: token ausente. Solicite um novo link em 'Esqueci minha senha'." />
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      <FormError message={state.error} />
      <input type="hidden" name="token" value={token} />

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="password">Nova senha</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          aria-required="true"
          aria-describedby="password-help"
        />
        <p id="password-help" className="text-xs text-muted-foreground">
          Mínimo de 10 caracteres, com letras e números ou símbolos.
        </p>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="passwordConfirmation">Confirmar nova senha</Label>
        <Input
          id="passwordConfirmation"
          name="passwordConfirmation"
          type="password"
          autoComplete="new-password"
          required
          aria-required="true"
        />
      </div>

      <SubmitButton className="mt-2 w-full">Definir senha</SubmitButton>
    </form>
  );
}
