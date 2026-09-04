"use client";

import { useFormState } from "react-dom";
import Link from "next/link";
import { loginAction, type LoginActionState } from "@/modules/auth-access/actions/login-action";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/ui/submit-button";
import { FormError } from "@/components/ui/form-error";

const initialState: LoginActionState = {};

export default function LoginPage() {
  const [state, formAction] = useFormState(loginAction, initialState);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Entrar</CardTitle>
        <CardDescription>Acesse com seu e-mail corporativo e senha.</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="flex flex-col gap-4" noValidate>
          <FormError message={state.error} />

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" name="email" type="email" autoComplete="username" required aria-required="true" />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="password">Senha</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              aria-required="true"
            />
          </div>

          <SubmitButton className="mt-2 w-full">Entrar</SubmitButton>

          <p className="text-center text-sm text-muted-foreground">
            <Link href="/esqueci-senha" className="text-primary underline-offset-4 hover:underline">
              Esqueci minha senha
            </Link>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
