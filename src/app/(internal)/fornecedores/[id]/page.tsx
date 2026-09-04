import { notFound } from "next/navigation";
import { getCurrentActor } from "@/modules/auth-access/services/current-actor";
import { authorize } from "@/modules/auth-access/domain/authorize";
import { getSupplierById, listAssignableResponsibleUsers } from "@/modules/suppliers/services/supplier-service";
import { listCategories } from "@/modules/categories/services/category-service";
import { listAuditLogs } from "@/modules/audit/services/audit-query-service";
import { Forbidden } from "@/components/layout/forbidden";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RegistrationStatusBadge, OperationalStatusBadge, CriticalityBadge } from "@/components/layout/status-badges";
import { CONTACT_TYPE_LABELS, SUPPLY_TYPE_LABELS } from "@/components/layout/nav-config";
import { formatCnpj } from "@/lib/cnpj";
import { formatDateTime } from "@/lib/time";
import { ReasonActionButton } from "../reason-action-button";
import { GovernanceForm } from "./governance-form";
import { ResponsiblesSection } from "./responsibles-section";
import {
  startReviewAction,
  validateRegistrationAction,
  requestAdjustmentsAction,
  rejectRegistrationAction,
  inactivateAction,
  reactivateAction,
  suspendAction,
  blockAction,
  unblockAction,
} from "@/modules/suppliers/actions/supplier-actions";

export default async function SupplierDetailPage({ params }: { params: { id: string } }) {
  const actor = await getCurrentActor();
  if (!actor || !authorize(actor, "supplier.view", { supplierId: params.id })) {
    return <Forbidden />;
  }

  const supplier = await getSupplierById(actor, params.id);
  if (!supplier) notFound();

  const canReview = authorize(actor, "supplier.registration.validate");
  const canGovern = authorize(actor, "supplier.edit.governance");
  const canSuspend = authorize(actor, "supplier.suspend");
  const canBlock = authorize(actor, "supplier.block");
  const canUnblock = authorize(actor, "supplier.unblock");

  const [categories, assignableUsers, history] = await Promise.all([
    listCategories(actor),
    canGovern ? listAssignableResponsibleUsers(actor) : Promise.resolve([]),
    listAuditLogs(actor, { entityType: "Supplier", entityId: supplier.id, pageSize: 15 }),
  ]);

  const fields = { supplierId: supplier.id };
  const status = supplier.registrationStatus;

  return (
    <div className="flex max-w-4xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">{supplier.legalName}</h1>
        {supplier.tradeName && <p className="text-muted-foreground">{supplier.tradeName}</p>}
        <p className="font-mono text-sm text-muted-foreground">{formatCnpj(supplier.cnpj)}</p>
        <div className="mt-2 flex flex-wrap gap-2">
          <RegistrationStatusBadge status={supplier.registrationStatus} />
          <OperationalStatusBadge status={supplier.operationalStatus} />
          <CriticalityBadge criticality={supplier.criticality} />
        </div>
      </div>

      {canReview && (
        <Card>
          <CardHeader>
            <CardTitle>Revisão do cadastro</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {status === "ENVIADO_PARA_ANALISE" && (
              <ReasonActionButton
                action={startReviewAction}
                hiddenFields={fields}
                label="Iniciar análise"
                requireReason={false}
              />
            )}
            {(status === "ENVIADO_PARA_ANALISE" || status === "EM_ANALISE") && (
              <>
                <ReasonActionButton
                  action={validateRegistrationAction}
                  hiddenFields={fields}
                  label="Validar cadastro"
                  variant="default"
                  requireReason={false}
                />
                <ReasonActionButton
                  action={requestAdjustmentsAction}
                  hiddenFields={fields}
                  label="Solicitar ajustes"
                  reasonLabel="O que o fornecedor precisa corrigir?"
                />
                <ReasonActionButton
                  action={rejectRegistrationAction}
                  hiddenFields={fields}
                  label="Rejeitar"
                  variant="destructive"
                  reasonLabel="Motivo da rejeição"
                />
              </>
            )}
            {status !== "INATIVO" && (
              <ReasonActionButton
                action={inactivateAction}
                hiddenFields={fields}
                label="Inativar"
                variant="destructive"
                reasonLabel="Motivo da inativação"
              />
            )}
            {status === "INATIVO" && (
              <ReasonActionButton
                action={reactivateAction}
                hiddenFields={fields}
                label="Reativar"
                reasonLabel="Motivo da reativação"
              />
            )}
          </CardContent>
        </Card>
      )}

      {(canSuspend || canBlock || canUnblock) && (
        <Card>
          <CardHeader>
            <CardTitle>Situação operacional</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {canSuspend && !["SUSPENSO", "BLOQUEADO"].includes(supplier.operationalStatus) && (
              <ReasonActionButton
                action={suspendAction}
                hiddenFields={fields}
                label="Suspender"
                variant="destructive"
                reasonLabel="Motivo da suspensão"
              />
            )}
            {canBlock && supplier.operationalStatus !== "BLOQUEADO" && (
              <ReasonActionButton
                action={blockAction}
                hiddenFields={fields}
                label="Bloquear"
                variant="destructive"
                reasonLabel="Motivo do bloqueio"
              />
            )}
            {canUnblock && ["SUSPENSO", "BLOQUEADO"].includes(supplier.operationalStatus) && (
              <ReasonActionButton
                action={unblockAction}
                hiddenFields={fields}
                label="Desbloquear / reativar situação"
                reasonLabel="Motivo do desbloqueio"
              />
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Dados cadastrais</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Fornecimento</p>
            <p className="font-medium">{supplier.supplyType ? SUPPLY_TYPE_LABELS[supplier.supplyType] : "—"}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Porte</p>
            <p className="font-medium">{supplier.companySize ?? "—"}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Site</p>
            <p className="font-medium">{supplier.website ?? "—"}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Situação cadastral informada</p>
            <p className="font-medium">{supplier.registeredStatusInformed ?? "—"}</p>
          </div>
          <div className="col-span-2">
            <p className="text-muted-foreground">Endereço</p>
            <p className="font-medium">
              {[
                supplier.addressStreet,
                supplier.addressNumber,
                supplier.addressDistrict,
                supplier.addressCity,
                supplier.addressState,
                supplier.addressZip,
              ]
                .filter(Boolean)
                .join(", ") || "—"}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Enviado para análise em</p>
            <p className="font-medium">{supplier.submittedAt ? formatDateTime(supplier.submittedAt) : "—"}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Validado em</p>
            <p className="font-medium">{supplier.validatedAt ? formatDateTime(supplier.validatedAt) : "—"}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Contatos</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {supplier.contacts.length === 0 && (
            <p className="text-sm text-muted-foreground">Nenhum contato cadastrado ainda.</p>
          )}
          {supplier.contacts.map((contact) => (
            <div key={contact.id} className="rounded-md border p-2 text-sm">
              <p className="font-medium">
                {contact.name} {contact.isPrimary && <span className="text-xs text-primary">(principal)</span>}
              </p>
              <p className="text-xs text-muted-foreground">
                {CONTACT_TYPE_LABELS[contact.contactType]} · {contact.email ?? "sem e-mail"} ·{" "}
                {contact.phone ?? "sem telefone"}
              </p>
            </div>
          ))}
        </CardContent>
      </Card>

      {canGovern && (
        <Card>
          <CardHeader>
            <CardTitle>Governança</CardTitle>
          </CardHeader>
          <CardContent>
            <GovernanceForm
              supplierId={supplier.id}
              criticality={supplier.criticality}
              supplyType={supplier.supplyType}
              categories={categories}
              selectedCategoryIds={supplier.categories.map((c) => c.categoryId)}
            />
          </CardContent>
        </Card>
      )}

      {!canGovern && supplier.categories.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Categorias</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            {supplier.categories.map((c) => c.category.name).join(", ")}
          </CardContent>
        </Card>
      )}

      {canGovern && (
        <Card>
          <CardHeader>
            <CardTitle>Responsáveis internos</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiblesSection
              supplierId={supplier.id}
              responsibles={supplier.responsibles}
              assignableUsers={assignableUsers}
            />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Histórico</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 text-sm">
          {history.items.length === 0 && <p className="text-muted-foreground">Sem eventos registrados ainda.</p>}
          {history.items.map((event) => (
            <div key={event.id} className="border-b pb-2 last:border-0">
              <p className="font-mono text-xs text-muted-foreground">{formatDateTime(event.createdAt)}</p>
              <p>
                <strong>{event.action}</strong>
                {event.actor ? ` — ${event.actor.name}` : ""}
                {event.reason ? `: ${event.reason}` : ""}
              </p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
