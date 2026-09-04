import { getCurrentActor } from "@/modules/auth-access/services/current-actor";
import { authorize } from "@/modules/auth-access/domain/authorize";
import { listCategories } from "@/modules/categories/services/category-service";
import { Forbidden } from "@/components/layout/forbidden";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { NewCategoryForm } from "./new-category-form";
import { ToggleCategoryButton } from "./toggle-category-button";

export default async function CategoriesPage() {
  const actor = await getCurrentActor();
  if (!actor || !authorize(actor, "category.view")) {
    return <Forbidden />;
  }

  const categories = await listCategories(actor, true);
  const canManage = authorize(actor, "category.manage");

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Categorias</h1>
        <p className="text-muted-foreground">
          Catálogo usado para classificar fornecedores (RF-030). A matriz de requisitos por
          categoria/criticidade chega em uma próxima fatia.
        </p>
      </div>

      {canManage && <NewCategoryForm />}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Código</TableHead>
            <TableHead>Nome</TableHead>
            <TableHead>Descrição</TableHead>
            <TableHead>Situação</TableHead>
            {canManage && <TableHead className="text-right">Ações</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {categories.length === 0 && (
            <TableRow>
              <TableCell colSpan={canManage ? 5 : 4} className="text-center text-muted-foreground">
                Nenhuma categoria cadastrada ainda.
              </TableCell>
            </TableRow>
          )}
          {categories.map((category) => (
            <TableRow key={category.id}>
              <TableCell className="font-mono text-xs">{category.code}</TableCell>
              <TableCell className="font-medium">{category.name}</TableCell>
              <TableCell className="text-xs text-muted-foreground">{category.description ?? "—"}</TableCell>
              <TableCell>
                <Badge variant={category.active ? "success" : "secondary"}>
                  {category.active ? "Ativa" : "Inativa"}
                </Badge>
              </TableCell>
              {canManage && (
                <TableCell className="text-right">
                  <ToggleCategoryButton categoryId={category.id} active={category.active} />
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
