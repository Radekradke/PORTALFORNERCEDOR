import { getCurrentActor } from "@/modules/auth-access/services/current-actor";
import { getSupplierById } from "@/modules/suppliers/services/supplier-service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RegistrationStatusBadge } from "@/components/layout/status-badges";
import { formatCnpj } from "@/lib/cnpj";
import { ProfileForm } from "./profile-form";
import { ContactsForm } from "./contacts-form";
import { SubmitForAnalysisButton } from "./submit-button";

const EDITABLE_STATUSES = ["CONVITE_ENVIADO", "EM_PREENCHIMENTO", "AJUSTES_SOLICITADOS"];

export default async function PortalEmpresaPage() {
  const actor = await getCurrentActor();
  if (!actor?.supplierId) return null;

  const supplier = await getSupplierById(actor, actor.supplierId);
  if (!supplier) return null;

  const canEdit = actor.role === "FORNECEDOR_ADMIN" && EDITABLE_STATUSES.includes(supplier.registrationStatus);
  const canSubmit = actor.role === "FORNECEDOR_ADMIN" && ["EM_PREENCHIMENTO", "AJUSTES_SOLICITADOS"].includes(
    supplier.registrationStatus,
  );

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Minha empresa</h1>
        <p className="font-mono text-sm text-muted-foreground">{formatCnpj(supplier.cnpj)}</p>
        <div className="mt-2">
          <RegistrationStatusBadge status={supplier.registrationStatus} />
        </div>
      </div>

      {supplier.registrationStatus === "AJUSTES_SOLICITADOS" && (
        <Card>
          <CardContent className="pt-6 text-sm">
            <p className="font-medium">A Lifting solicitou ajustes no seu cadastro.</p>
            <p className="text-muted-foreground">Consulte o histórico para ver o motivo detalhado.</p>
          </CardContent>
        </Card>
      )}

      {!canEdit && actor.role === "FORNECEDOR_COLABORADOR" && (
        <Card>
          <CardContent className="pt-6 text-sm text-muted-foreground">
            Somente o administrador do fornecedor pode editar os dados da empresa.
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Dados cadastrais</CardTitle>
        </CardHeader>
        <CardContent>
          {canEdit ? (
            <ProfileForm supplier={supplier} />
          ) : (
            <dl className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="text-muted-foreground">Razão social</dt>
                <dd className="font-medium">{supplier.legalName}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Nome fantasia</dt>
                <dd className="font-medium">{supplier.tradeName ?? "—"}</dd>
              </div>
              <div className="col-span-2">
                <dt className="text-muted-foreground">Endereço</dt>
                <dd className="font-medium">
                  {[supplier.addressStreet, supplier.addressNumber, supplier.addressCity, supplier.addressState]
                    .filter(Boolean)
                    .join(", ") || "—"}
                </dd>
              </div>
            </dl>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Contatos</CardTitle>
        </CardHeader>
        <CardContent>
          <ContactsForm supplierId={supplier.id} contacts={supplier.contacts} canEdit={canEdit} />
        </CardContent>
      </Card>

      {canSubmit && (
        <Card>
          <CardContent className="pt-6">
            <SubmitForAnalysisButton supplierId={supplier.id} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
