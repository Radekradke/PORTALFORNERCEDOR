import path from "node:path";
import { test, expect } from "@playwright/test";

const COMPRAS = { email: "compras@lifting.local", password: "Compras#2026Local" };
const QSMS = { email: "qsms@lifting.local", password: "Qsms#2026Local" };
const ALFA_ADMIN = { email: "admin@alfa-materiais.local", password: "Alfa#2026Local" };
const GAMA_ADMIN = { email: "admin@gama-industrial.local", password: "Gama#2026Local" };

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

// Cada teste cria seus próprios registros (NC não tem chave única por
// fornecedor), então este arquivo roda em desktop e mobile na mesma suíte.
test.describe("Não conformidade e plano de ação (F6)", () => {
  test("ciclo completo: criar manualmente, plano, revisão, correção, verificação, encerramento e reabertura", async ({
    page,
  }) => {
    await login(page, QSMS.email, QSMS.password);
    await page.goto("/nao-conformidades/novo");
    await selectByOptionText(page, "#supplierId", "Alfa");
    await page.locator("#severity").selectOption("ALTA");
    await page.locator("#description").fill("Ausência de sinalização de área de risco elétrico.");
    await page.locator("#responsibleInternalId").selectOption({ index: 1 });
    await page.getByRole("button", { name: "Criar não conformidade" }).click();
    await page.waitForURL(/\/nao-conformidades\/(?!novo)[a-z0-9]+$/);
    const ncId = page.url().split("/").pop()!;
    await expect(page.getByText("Aguardando plano").first()).toBeVisible();
    await page.getByRole("button", { name: "Sair" }).click();

    // Fornecedor envia o plano de ação (RF-094).
    await login(page, ALFA_ADMIN.email, ALFA_ADMIN.password);
    await page.goto(`/portal-fornecedor/nao-conformidades/${ncId}`);
    await expect(page.getByText("Ausência de sinalização de área de risco elétrico.")).toBeVisible();
    await page.locator("#cause").fill("Falta de checklist de sinalização antes do início do serviço.");
    await page.locator("#correctiveAction").fill("Instalar placas de sinalização e treinar a equipe.");
    await page.locator("#responsibleName").fill("João da Silva (Alfa)");
    await page.locator("#proposedDeadline").fill("2026-10-01");
    await page.getByRole("button", { name: "Enviar plano" }).click();
    await expect(page.getByText("aguardando análise")).toBeVisible();
    await page.getByRole("button", { name: "Sair" }).click();

    // Compras (com NC_DECIDE) aceita o plano.
    await login(page, COMPRAS.email, COMPRAS.password);
    await page.goto(`/nao-conformidades/${ncId}`);
    await expect(page.getByText("Plano em análise").first()).toBeVisible();
    await page.locator("#decision").selectOption("ACEITO");
    await page.getByRole("button", { name: "Registrar decisão" }).click();
    await expect(page.getByText("Em correção").first()).toBeVisible();
    await page.getByRole("button", { name: "Sair" }).click();

    // Fornecedor anexa evidência de correção e sinaliza pronto para verificação.
    await login(page, ALFA_ADMIN.email, ALFA_ADMIN.password);
    await page.goto(`/portal-fornecedor/nao-conformidades/${ncId}`);
    await page.locator('input[type="file"]').setInputFiles(SAMPLE_PDF);
    await page.getByRole("button", { name: "Anexar evidência" }).click();
    await expect(page.getByRole("link", { name: "sample.pdf" })).toBeVisible();
    await page.getByRole("button", { name: "Sinalizar correção concluída" }).click();
    await expect(page.getByText("Aguardando verificação da Lifting.")).toBeVisible();
    await page.getByRole("button", { name: "Sair" }).click();

    // QSMS verifica e encerra (RF-096).
    await login(page, QSMS.email, QSMS.password);
    await page.goto(`/nao-conformidades/${ncId}`);
    await expect(page.getByText("Aguardando verificação").first()).toBeVisible();
    await page.locator("#method").selectOption("REMOTA");
    await page.locator("#decision").selectOption("APROVADA");
    await page.getByRole("button", { name: "Registrar verificação" }).click();
    await expect(page.getByText("Encerrada").first()).toBeVisible();

    // Reabertura (RF-097) — QSMS tem NC_REOPEN.
    await page.getByRole("button", { name: "Reabrir NC" }).click();
    await page.getByLabel("Motivo da reabertura").fill("Reincidência identificada em nova visita.");
    await page.locator("#newDeadline").fill("2026-11-01");
    await page.locator("#targetStatus").selectOption("EM_CORRECAO");
    await page.getByRole("button", { name: "Confirmar reabertura" }).click();
    await expect(page.getByText("Em correção").first()).toBeVisible();
  });

  test("CA-14: item não conforme com generatesNonConformity cria rascunho de NC vinculado ao item", async ({
    page,
  }) => {
    await login(page, QSMS.email, QSMS.password);

    await page.goto("/fiscalizacoes/novo");
    await selectByOptionText(page, "#supplierId", "Gama Industrial");
    await selectByOptionText(page, "#templateId", CHECKLIST_TITLE);
    await page.locator("#inspectorId").selectOption({ index: 1 });
    const scheduledAt = new Date(Date.now() + Math.floor(Math.random() * 100000));
    await page.locator("#scheduledAt").fill(scheduledAt.toISOString().slice(0, 16));
    await page.getByRole("button", { name: "Programar fiscalização" }).click();
    await page.waitForURL(/\/fiscalizacoes\/(?!novo)[a-z0-9]+$/);

    const epiItem = page.locator("form").filter({ hasText: "Uso correto de EPI por toda a equipe" });
    await epiItem.getByRole("button", { name: "Não conforme", exact: true }).click();
    await epiItem.locator('textarea[name="observation"]').fill("Dois colaboradores sem óculos de proteção.");
    await epiItem.locator('input[type="file"]').setInputFiles(SAMPLE_PDF);
    await epiItem.getByRole("button", { name: "Salvar resposta" }).click();

    const sinalizacaoItem = page.locator("form").filter({ hasText: "Sinalização de área isolada e visível" });
    await sinalizacaoItem.getByRole("button", { name: "Conforme", exact: true }).click();
    await sinalizacaoItem.getByRole("button", { name: "Salvar resposta" }).click();

    const artItem = page.locator("form").filter({ hasText: "Equipe porta cópia da ART/PPRA vigente" });
    await artItem.getByRole("button", { name: "Conforme", exact: true }).click();
    await artItem.getByRole("button", { name: "Salvar resposta" }).click();

    await page.getByRole("button", { name: "Concluir fiscalização" }).click();
    await expect(page.getByText("Concluída").first()).toBeVisible();

    // O rascunho de NC (CA-14) só aparece internamente, na aba de rascunhos (ABERTA).
    await page.goto("/nao-conformidades?status=ABERTA");
    await expect(page.getByRole("link", { name: /^NC-/ }).first()).toBeVisible();
    await page.getByRole("link", { name: /^NC-/ }).first().click();
    await page.waitForURL(/\/nao-conformidades\/[a-z0-9]+$/);
    const ncId = page.url().split("/").pop()!;
    await expect(page.getByText(/Uso correto de EPI por toda a equipe/).first()).toBeVisible();
    await expect(page.locator("#severity")).toHaveValue("ALTA"); // defaultSeverity do item, semeado no checklist

    await page.getByRole("button", { name: "Confirmar e abrir para o fornecedor" }).click();
    await page.getByRole("button", { name: "Confirmar" }).click();
    await expect(page.getByText("Aguardando plano").first()).toBeVisible();
    await page.getByRole("button", { name: "Sair" }).click();

    // Só a partir daqui o fornecedor enxerga a NC.
    await login(page, GAMA_ADMIN.email, GAMA_ADMIN.password);
    await page.goto("/portal-fornecedor/nao-conformidades");
    await expect(page.getByText(/^NC-/).first()).toBeVisible();
    const notFoundResponse = await page.goto(`/portal-fornecedor/nao-conformidades/${ncId}`);
    expect(notFoundResponse?.status()).toBe(200); // já aberta — deve carregar normalmente agora
  });
});
