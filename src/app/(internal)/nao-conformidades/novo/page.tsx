import { getCurrentActor } from "@/modules/auth-access/services/current-actor";
import { authorize } from "@/modules/auth-access/domain/authorize";
import { listSuppliers } from "@/modules/suppliers/services/supplier-service";
import { listCategories } from "@/modules/categories/services/category-service";
import { listAssignableNcResponsibles } from "@/modules/nonconformities/services/nc-service";
import { Forbidden } from "@/components/layout/forbidden";
import { NewNcForm } from "./new-nc-form";

export default async function NewNonConformityPage() {
  const actor = await getCurrentActor();
  if (!actor || !authorize(actor, "nc.manage")) {
    return <Forbidden />;
  }

  const [{ items: suppliers }, categories, responsibles] = await Promise.all([
    listSuppliers(actor, { pageSize: 100 }),
    listCategories(actor),
    listAssignableNcResponsibles(actor),
  ]);

  return (
    <div className="max-w-xl">
      <h1 className="mb-1 text-2xl font-semibold">Nova não conformidade</h1>
      <p className="mb-6 text-muted-foreground">
        Criação manual (RF-090) — já nasce visível ao fornecedor, aguardando o plano de ação.
      </p>
      <NewNcForm
        suppliers={suppliers.map((s) => ({ id: s.id, legalName: s.legalName, cnpj: s.cnpj }))}
        categories={categories.map((c) => ({ id: c.id, label: c.name }))}
        responsibles={responsibles.map((r) => ({ id: r.id, label: `${r.name} (${r.email})` }))}
      />
    </div>
  );
}
