import Link from "next/link";
import { getCurrentActor } from "@/modules/auth-access/services/current-actor";
import { authorize } from "@/modules/auth-access/domain/authorize";
import { listSuppliers } from "@/modules/suppliers/services/supplier-service";
import { listChecklistTemplates } from "@/modules/inspections/services/checklist-service";
import { listAssignableInspectors } from "@/modules/inspections/services/inspection-service";
import { Forbidden } from "@/components/layout/forbidden";
import { NewInspectionForm } from "./new-inspection-form";

export default async function NewInspectionPage() {
  const actor = await getCurrentActor();
  if (!actor || !authorize(actor, "inspection.manage")) {
    return <Forbidden />;
  }

  const [{ items: suppliers }, templates, inspectors] = await Promise.all([
    listSuppliers(actor, { pageSize: 100 }),
    listChecklistTemplates(actor),
    listAssignableInspectors(actor),
  ]);

  if (templates.length === 0) {
    return (
      <div className="max-w-lg">
        <h1 className="mb-1 text-2xl font-semibold">Nova fiscalização</h1>
        <p className="text-muted-foreground">
          Cadastre um checklist ativo com ao menos um item em{" "}
          <Link href="/checklists" className="text-primary underline underline-offset-4">
            Checklists
          </Link>{" "}
          antes de programar uma fiscalização.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-xl">
      <h1 className="mb-1 text-2xl font-semibold">Nova fiscalização</h1>
      <p className="mb-6 text-muted-foreground">
        O checklist selecionado é congelado no momento da criação (RF-074) — editar o modelo
        depois não altera esta fiscalização.
      </p>
      <NewInspectionForm
        suppliers={suppliers.map((s) => ({ id: s.id, legalName: s.legalName, cnpj: s.cnpj }))}
        templates={templates.map((t) => ({ id: t.id, label: t.title }))}
        inspectors={inspectors.map((i) => ({ id: i.id, label: `${i.name} (${i.email})` }))}
      />
    </div>
  );
}
