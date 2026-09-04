import { getCurrentActor } from "@/modules/auth-access/services/current-actor";
import { authorize } from "@/modules/auth-access/domain/authorize";
import { listRequirementTypes } from "@/modules/requirements/services/requirement-type-service";
import { listRequirementRules } from "@/modules/requirements/services/requirement-rule-service";
import { listCategories } from "@/modules/categories/services/category-service";
import { Forbidden } from "@/components/layout/forbidden";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { OBLIGATION_LABELS, VALIDITY_TYPE_LABELS, CRITICALITY_LABELS } from "@/components/layout/nav-config";
import { NewRequirementTypeForm } from "./new-requirement-type-form";
import { NewRequirementRuleForm } from "./new-requirement-rule-form";
import { ToggleTypeButton, ToggleRuleButton } from "./toggle-buttons";

export default async function RequirementsPage() {
  const actor = await getCurrentActor();
  if (!actor || !authorize(actor, "requirement.view")) {
    return <Forbidden />;
  }

  const [types, rules, categories] = await Promise.all([
    listRequirementTypes(actor, true),
    listRequirementRules(actor, true),
    listCategories(actor),
  ]);

  const canManage = authorize(actor, "requirement.manage");

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Requisitos</h1>
        <p className="text-muted-foreground">
          Tipos de documento (RF-031) e matriz por categoria/criticidade (RF-032). Editar aqui não
          altera pendências já geradas — use &ldquo;Reaplicar matriz&rdquo; na ficha do fornecedor.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tipos de documento</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {canManage && <NewRequirementTypeForm />}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>Validade</TableHead>
                <TableHead>Formatos</TableHead>
                <TableHead>Situação</TableHead>
                {canManage && <TableHead className="text-right">Ações</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {types.length === 0 && (
                <TableRow>
                  <TableCell colSpan={canManage ? 6 : 5} className="text-center text-muted-foreground">
                    Nenhum tipo de documento cadastrado ainda.
                  </TableCell>
                </TableRow>
              )}
              {types.map((type) => (
                <TableRow key={type.id}>
                  <TableCell className="font-mono text-xs">{type.code}</TableCell>
                  <TableCell className="font-medium">{type.name}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {VALIDITY_TYPE_LABELS[type.validityType]}
                    {type.validityType === "FIXA" && ` (${type.validityDays} dias)`}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {type.allowedFormats.length > 0 ? type.allowedFormats.join(", ") : "PDF, JPG, PNG"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={type.active ? "success" : "secondary"}>{type.active ? "Ativo" : "Inativo"}</Badge>
                  </TableCell>
                  {canManage && (
                    <TableCell className="text-right">
                      <ToggleTypeButton id={type.id} active={type.active} />
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Matriz de requisitos</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {canManage && <NewRequirementRuleForm types={types.filter((t) => t.active)} categories={categories} />}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Categoria</TableHead>
                <TableHead>Tipo de documento</TableHead>
                <TableHead>Criticidade</TableHead>
                <TableHead>Obrigatoriedade</TableHead>
                <TableHead>Situação</TableHead>
                {canManage && <TableHead className="text-right">Ações</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rules.length === 0 && (
                <TableRow>
                  <TableCell colSpan={canManage ? 6 : 5} className="text-center text-muted-foreground">
                    Nenhuma regra cadastrada ainda.
                  </TableCell>
                </TableRow>
              )}
              {rules.map((rule) => (
                <TableRow key={rule.id}>
                  <TableCell>{rule.category.name}</TableCell>
                  <TableCell>{rule.requirementType.name}</TableCell>
                  <TableCell className="text-xs">
                    {rule.criticalities.map((c) => CRITICALITY_LABELS[c]).join(", ")}
                  </TableCell>
                  <TableCell className="text-xs">{OBLIGATION_LABELS[rule.obligation]}</TableCell>
                  <TableCell>
                    <Badge variant={rule.active ? "success" : "secondary"}>{rule.active ? "Ativa" : "Inativa"}</Badge>
                  </TableCell>
                  {canManage && (
                    <TableCell className="text-right">
                      <ToggleRuleButton id={rule.id} active={rule.active} />
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
