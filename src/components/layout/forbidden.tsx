import { Alert, AlertDescription } from "@/components/ui/alert";

export function Forbidden() {
  return (
    <Alert variant="destructive" role="alert">
      <AlertDescription>
        Você não tem permissão para acessar esta área. Se acredita que isso é um engano, contate o
        Administrador de TI.
      </AlertDescription>
    </Alert>
  );
}
