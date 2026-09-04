import Link from "next/link";
import { getCurrentActor } from "@/modules/auth-access/services/current-actor";
import { authorize } from "@/modules/auth-access/domain/authorize";
import { listSuppliers } from "@/modules/suppliers/services/supplier-service";
import { Forbidden } from "@/components/layout/forbidden";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RegistrationStatusBadge, OperationalStatusBadge, CriticalityBadge } from "@/components/layout/status-badges";
import { REGISTRATION_STATUS_LABELS } from "@/components/layout/nav-config";
import { formatCnpj } from "@/lib/cnpj";

export default async function SuppliersPage({
  searchParams,
}: {
  searchParams: { busca?: string; status?: string; pagina?: string };
}) {
  const actor = await getCurrentActor();
  if (!actor || !authorize(actor, "supplier.view")) {
    return <Forbidden />;
  }

  const page = Number(searchParams.pagina ?? "1") || 1;
  const { items, total, pageSize } = await listSuppliers(actor, {
    search: searchParams.busca,
    registrationStatus: searchParams.status,
    page,
  });
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const canCreate = authorize(actor, "supplier.create");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Fornecedores</h1>
          <p className="text-muted-foreground">Cadastro, convite e situação de cada fornecedor.</p>
        </div>
        {canCreate && (
          <Button asChild>
            <Link href="/fornecedores/novo">Novo fornecedor</Link>
          </Button>
        )}
      </div>

      <form className="flex flex-wrap items-end gap-3" method="get">
        <div className="flex flex-col gap-1">
          <label htmlFor="busca" className="text-xs font-medium">
            Buscar (razão social, nome fantasia ou CNPJ)
          </label>
          <input
            id="busca"
            name="busca"
            defaultValue={searchParams.busca}
            className="h-9 w-64 rounded-md border border-input bg-background px-3 text-sm"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="status" className="text-xs font-medium">
            Status cadastral
          </label>
          <select
            id="status"
            name="status"
            defaultValue={searchParams.status ?? ""}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="">Todos</option>
            {Object.entries(REGISTRATION_STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <button type="submit" className="h-9 rounded-md bg-primary px-4 text-sm text-primary-foreground">
          Filtrar
        </button>
      </form>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Razão social</TableHead>
            <TableHead>CNPJ</TableHead>
            <TableHead>Criticidade</TableHead>
            <TableHead>Status cadastral</TableHead>
            <TableHead>Situação</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-muted-foreground">
                Nenhum fornecedor encontrado para o filtro informado.
              </TableCell>
            </TableRow>
          )}
          {items.map((supplier) => (
            <TableRow key={supplier.id}>
              <TableCell className="font-medium">
                <Link href={`/fornecedores/${supplier.id}`} className="hover:underline">
                  {supplier.legalName}
                </Link>
                {supplier.tradeName && (
                  <p className="text-xs text-muted-foreground">{supplier.tradeName}</p>
                )}
              </TableCell>
              <TableCell className="font-mono text-xs">{formatCnpj(supplier.cnpj)}</TableCell>
              <TableCell>
                <CriticalityBadge criticality={supplier.criticality} />
              </TableCell>
              <TableCell>
                <RegistrationStatusBadge status={supplier.registrationStatus} />
              </TableCell>
              <TableCell>
                <OperationalStatusBadge status={supplier.operationalStatus} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <p className="text-xs text-muted-foreground">
        Página {page} de {totalPages} — {total} fornecedores.
      </p>
    </div>
  );
}
