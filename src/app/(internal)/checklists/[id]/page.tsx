import { notFound } from "next/navigation";
import { getCurrentActor } from "@/modules/auth-access/services/current-actor";
import { authorize } from "@/modules/auth-access/domain/authorize";
import { getChecklistTemplateDetail } from "@/modules/inspections/services/checklist-service";
import { Forbidden } from "@/components/layout/forbidden";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { INSPECTION_RESPONSE_LABELS, CRITICALITY_LABELS } from "@/components/layout/nav-config";
import { NewSectionForm } from "./new-section-form";
import { NewItemForm } from "./new-item-form";

export default async function ChecklistDetailPage({ params }: { params: { id: string } }) {
  const actor = await getCurrentActor();
  if (!actor || !authorize(actor, "checklist.view")) {
    return <Forbidden />;
  }

  const template = await getChecklistTemplateDetail(actor, params.id);
  if (!template) notFound();

  const canManage = authorize(actor, "checklist.manage");

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">{template.title}</h1>
        {template.description && <p className="text-muted-foreground">{template.description}</p>}
        <div className="mt-2 flex flex-wrap gap-2">
          <Badge variant={template.active ? "success" : "secondary"}>{template.active ? "Ativo" : "Inativo"}</Badge>
          {template.category && <Badge variant="secondary">{template.category.name}</Badge>}
        </div>
      </div>

      {template.sections.length === 0 && (
        <Card>
          <CardContent className="pt-6 text-sm text-muted-foreground">
            Nenhuma seção cadastrada ainda. Adicione uma seção e depois os itens do checklist.
          </CardContent>
        </Card>
      )}

      {template.sections.map((section) => (
        <Card key={section.id}>
          <CardHeader>
            <CardTitle className="text-base">{section.title}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {section.items.length === 0 && (
              <p className="text-sm text-muted-foreground">Nenhum item nesta seção ainda.</p>
            )}
            {section.items.map((item) => (
              <div key={item.id} className="rounded-md border p-3 text-sm">
                <p className="font-medium">{item.text}</p>
                {item.guidance && <p className="text-xs text-muted-foreground">{item.guidance}</p>}
                <p className="mt-1 text-xs text-muted-foreground">
                  Respostas: {item.allowedResponses.map((r) => INSPECTION_RESPONSE_LABELS[r]).join(", ")}
                </p>
                {item.evidenceRequiredOn.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Evidência obrigatória em: {item.evidenceRequiredOn.map((r) => INSPECTION_RESPONSE_LABELS[r]).join(", ")}
                  </p>
                )}
                {item.observationRequiredOn.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Observação obrigatória em: {item.observationRequiredOn.map((r) => INSPECTION_RESPONSE_LABELS[r]).join(", ")}
                  </p>
                )}
                {item.generatesNonConformity && (
                  <p className="text-xs text-warning">
                    Sugere NC{item.defaultSeverity && ` — gravidade padrão ${CRITICALITY_LABELS[item.defaultSeverity]}`}
                  </p>
                )}
              </div>
            ))}
            {canManage && <NewItemForm templateId={template.id} sectionId={section.id} />}
          </CardContent>
        </Card>
      ))}

      {canManage && <NewSectionForm templateId={template.id} />}
    </div>
  );
}
