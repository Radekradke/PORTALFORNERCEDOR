import path from "node:path";
import { test, expect } from "@playwright/test";

const QSMS = { email: "qsms@lifting.local", password: "Qsms#2026Local" };
const GAMA_ADMIN = { email: "admin@gama-industrial.local", password: "Gama#2026Local" };
const BETA_ADMIN = { email: "admin@beta-servicos.local", password: "Beta#2026Local" };

const SAMPLE_PDF = path.join(__dirname, "fixtures", "sample.pdf");
const CHECKLIST_TITLE = "Inspeção de segurança em campo";

async function login(page: import("@playwright/test").Page, email: string, password: string) {
  await page.goto("/login");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill(password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL(/\/(dashboard|portal-fornecedor)/, { timeout: 15000 });
}

async function selectByOptionText(page: import("@playwright/test").Page, selector: string, text: string) {
  const value = await page.locator(`${selector} option`, { hasText: text }).first().getAttribute("value");
  await page.locator(selector).selectOption(value!);
}

async function scheduleInspection(page: import("@playwright/test").Page, supplierMatch: string) {
  await page.goto("/fiscalizacoes/novo");
  await selectByOptionText(page, "#supplierId", supplierMatch);
  await selectByOptionText(page, "#templateId", CHECKLIST_TITLE);
  await page.locator("#inspectorId").selectOption({ index: 1 }); // único fiscal QSMS ativo do seed
  const scheduledAt = new Date(Date.now() + Math.floor(Math.random() * 100000));
  await page.locator("#scheduledAt").fill(scheduledAt.toISOString().slice(0, 16));
  await page.getByRole("button", { name: "Programar fiscalização" }).click();
  await page.waitForURL(/\/fiscalizacoes\/(?!novo)[a-z0-9]+$/);
  return page.url().split("/").pop()!;
}

// Cada teste programa sua própria fiscalização (Inspection não tem chave
// única por fornecedor — diferente de documents.spec.ts/qualification.spec.ts,
// aqui é seguro rodar em mais de um projeto Playwright), por isso este
// arquivo cobre desktop e mobile na mesma suíte (fiscalização é mobile-first).
test.describe("Fiscalização (F5)", () => {
  test("QSMS programa, executa em campo e conclui; fornecedor vê o resultado publicado", async ({ page }) => {
    await login(page, QSMS.email, QSMS.password);
    const inspectionId = await scheduleInspection(page, "Gama Industrial");
    await expect(page.getByText("Programada").first()).toBeVisible();

    const item1 = page.locator("form").filter({ hasText: "Uso correto de EPI por toda a equipe" });
    await item1.getByRole("button", { name: "Não conforme", exact: true }).click();
    await item1.locator('textarea[name="observation"]').fill("Um colaborador sem capacete na área.");
    await item1.locator('input[type="file"]').setInputFiles(SAMPLE_PDF);
    await item1.getByRole("button", { name: "Salvar resposta" }).click();
    await expect(page.getByText("Em andamento").first()).toBeVisible();

    const item2 = page.locator("form").filter({ hasText: "Sinalização de área isolada e visível" });
    await item2.getByRole("button", { name: "Conforme", exact: true }).click();
    await item2.getByRole("button", { name: "Salvar resposta" }).click();

    const item3 = page.locator("form").filter({ hasText: "Equipe porta cópia da ART/PPRA vigente" });
    await item3.getByRole("button", { name: "Conforme", exact: true }).click();
    await item3.getByRole("button", { name: "Salvar resposta" }).click();

    await page.getByRole("button", { name: "Concluir fiscalização" }).click();
    await expect(page.getByText("Concluída").first()).toBeVisible();
    await expect(page.getByText("67%").first()).toBeVisible(); // 2 conformes / 3 aplicáveis (RN-015)
    await page.getByRole("button", { name: "Sair" }).click();

    await login(page, GAMA_ADMIN.email, GAMA_ADMIN.password);
    await page.goto("/portal-fornecedor/fiscalizacoes");
    await expect(page.getByText(CHECKLIST_TITLE).first()).toBeVisible();

    // Navega direto pelo id (em vez de clicar na listagem): a listagem pode
    // conter fiscalizações concluídas de execuções anteriores desta mesma
    // suíte, então "a primeira da lista" não é garantidamente esta.
    await page.goto(`/portal-fornecedor/fiscalizacoes/${inspectionId}`);
    await expect(page.getByText("Um colaborador sem capacete na área.")).toBeVisible();
    await expect(page.getByRole("link", { name: "sample.pdf" })).toBeVisible();
  });

  test("RF-078 bloqueia conclusão com item pendente; cancelamento (RF-082) fica invisível ao fornecedor (RN-021)", async ({
    page,
  }) => {
    await login(page, QSMS.email, QSMS.password);
    const inspectionId = await scheduleInspection(page, "Beta Serviços");

    const item1 = page.locator("form").filter({ hasText: "Uso correto de EPI por toda a equipe" });
    await item1.getByRole("button", { name: "Conforme", exact: true }).click();
    await item1.getByRole("button", { name: "Salvar resposta" }).click();
    // item2 e item3 ficam sem resposta de propósito.

    await page.getByRole("button", { name: "Concluir fiscalização" }).click();
    await expect(page.getByText(/itens pendentes/)).toBeVisible();
    await expect(page.getByText("Em andamento").first()).toBeVisible(); // não avançou para Concluída

    await page.getByRole("button", { name: "Cancelar fiscalização" }).click();
    await page.getByLabel(/Motivo do cancelamento/).fill("Acesso à obra interditado pelo fornecedor.");
    await page.getByRole("button", { name: "Confirmar" }).click();
    await expect(page.getByText("Cancelada").first()).toBeVisible();
    await expect(page.getByText("Acesso à obra interditado pelo fornecedor.")).toBeVisible();
    await page.getByRole("button", { name: "Sair" }).click();

    await login(page, BETA_ADMIN.email, BETA_ADMIN.password);
    const response = await page.goto(`/portal-fornecedor/fiscalizacoes/${inspectionId}`);
    expect(response?.status()).toBe(404);
  });
});
