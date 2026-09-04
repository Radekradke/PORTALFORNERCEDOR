"use client";

import { useFormStatus } from "react-dom";
import { Button, type ButtonProps } from "./button";

/**
 * Botão de envio com estado de carregamento e prevenção de clique duplicado
 * (diretrizes de experiência: "prevenção de envio duplicado").
 */
export function SubmitButton({ children, disabled, ...props }: ButtonProps) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending || disabled} aria-busy={pending} {...props}>
      {pending ? "Enviando..." : children}
    </Button>
  );
}
