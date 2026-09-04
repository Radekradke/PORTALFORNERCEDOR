"use client";

import { useFormState } from "react-dom";
import Link from "next/link";
import {
  forgotPasswordAction,
  type ForgotPasswordState,
} from "@/modules/auth-access/actions/password-actions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/ui/submit-button";
import { FormError } from "@/components/ui/form-error";
import { Alert, AlertDescription } from "@/components/ui/alert";

const initialState: ForgotPasswordState = {};

export default function ForgotPasswordPage() {
  const [state, formAction] = useFormState(forgotPasswordAction, initialState);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Esqueci minha senha</CardTitle>
        <CardDescription>Enviaremos um link de redefinição para o e-mail informado.</CardDescription>
      </CardHeader>
      <CardContent>
        {state.submitted ? (
          <Alert variant="success">
            <AlertDescription>
              Se o e-mail informado estiver cadastrado, você receberá um link para definir uma nova
              senha em instantes. Verifique também a caixa de spam.
            </AlertDescription>
          </Alert>
        ) : (
          <form action={formAction} className="flex flex-col gap-4" noValidate>
            <FormError message={state.error} />
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" name="email" type="email" autoComplete="username" required aria-required="true" />
            </div>
            <SubmitButton className="mt-2 w-full">Enviar link</SubmitButton>
          </form>
        )}

        <p className="mt-4 text-center text-sm text-muted-foreground">
          <Link href="/login" className="text-primary underline-offset-4 hover:underline">
            Voltar ao login
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
