import Link from "next/link";
import { getCurrentActor } from "@/modules/auth-access/services/current-actor";
import { authorize } from "@/modules/auth-access/domain/authorize";
import { listCategories } from "@/modules/categories/services/category-service";
import { Forbidden } from "@/components/layout/forbidden";
import { NewSupplierForm } from "./new-supplier-form";

export default async function NewSupplierPage() {
  const actor = await getCurrentActor();
  if (!actor || !authorize(actor, "supplier.create")) {
    return <Forbidden />;
  }

  const categories = await listCategories(actor);

  if (categories.length === 0) {
    return (
      <div className="max-w-lg">
        <h1 className="mb-1 text-2xl font-semibold">Novo fornecedor</h1>
        <p className="text-muted-foreground">
          Cadastre ao menos uma categoria em{" "}
          <Link href="/categorias" className="text-primary underline underline-offset-4">
            Categorias
          </Link>{" "}
          antes de convidar um fornecedor.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-xl">
      <h1 className="mb-1 text-2xl font-semibold">Novo fornecedor</h1>
      <p className="mb-6 text-muted-foreground">
        Um e-mail de ativação será enviado ao contato principal para criar a senha e iniciar o
        cadastro.
      </p>
      <NewSupplierForm categories={categories} />
    </div>
  );
}
