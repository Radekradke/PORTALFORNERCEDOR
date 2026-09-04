import Link from "next/link";
import { getCurrentActor } from "@/modules/auth-access/services/current-actor";
import { authorize } from "@/modules/auth-access/domain/authorize";
import { listChecklistTemplates } from "@/modules/inspections/services/checklist-service";
import { listCategories } from "@/modules/categories/services/category-service";
import { Forbidden } from "@/components/layout/forbidden";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { NewTemplateForm } from "./new-template-form";
import { ToggleTemplateButton } from "./toggle-template-button";

export default async function ChecklistsPage() {
  const actor = await getCurrentActor();
  if (!actor || !authorize(actor, "checklist.view")) {
    return <Forbidden />;
  }

  const canManage = authorize(actor, "checklist.manage");
  const [templates, categories] = await Promise.all([
    listChecklistTemplates(actor, true),
    listCategories(actor),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Checklists</h1>
        <p className="text-muted-foreground">
          Modelos de checklist para fiscalização (RF-070). Editar um modelo aqui só afeta
          fiscalizações futuras — as já criadas mantêm o checklist congelado no momento em que
          foram programadas (RN-013).
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Modelos</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {canManage && <NewTemplateForm categories={categories} />}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Título</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Seções</TableHead>
                <TableHead>Situação</TableHead>
                {canManage && <TableHead className="text-right">Ações</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {templates.length === 0 && (
                <TableRow>
                  <TableCell colSpan={canManage ? 5 : 4} className="text-center text-muted-foreground">
                    Nenhum checklist cadastrado ainda.
                  </TableCell>
                </TableRow>
              )}
              {templates.map((template) => (
                <TableRow key={template.id}>
                  <TableCell className="font-medium">
                    <Link href={`/checklists/${template.id}`} className="hover:underline">
                      {template.title}
                    </Link>
                    {template.description && (
                      <p className="text-xs text-muted-foreground">{template.description}</p>
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{template.category?.name ?? "—"}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{template.sections.length}</TableCell>
                  <TableCell>
                    <Badge variant={template.active ? "success" : "secondary"}>
                      {template.active ? "Ativo" : "Inativo"}
                    </Badge>
                  </TableCell>
                  {canManage && (
                    <TableCell className="text-right">
                      <ToggleTemplateButton templateId={template.id} active={template.active} />
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
