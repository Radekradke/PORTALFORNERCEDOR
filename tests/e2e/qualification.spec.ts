import { test, expect } from "@playwright/test";

const COMPRAS = { email: "compras@lifting.local", password: "Compras#2026Local" };
const QSMS = { email: "qsms@lifting.local", password: "Qsms#2026Local" };
const BETA_ADMIN = { email: "admin@beta-servicos.local", password: "Beta#2026Local" };

async function login(page: import("@playwright/test").Page, email: string, password: string) {
  await page.goto("/login");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill(password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL(/\/(dashboard|portal-fornecedor)/, { timeout: 15000 });
}

async function goToSupplier(page: import("@playwright/test").Page, nameMatch: RegExp) {
  await page.goto("/fornecedores");
  await page.getByRole("link", { name: nameMatch }).click();
  await page.waitForURL(/\/fornecedores\/(?!novo)[a-z0-9]+$/);
}

// Continua a mutação feita por documents.spec.ts (roda antes, ordem
// alfabética de arquivo): Beta chega aqui com cadastro validado e o único
// requisito obrigatório (PPRA/PGR) já aprovado; Alfa chega com cadastro
// validado e o único obrigatório (ART) rejeitado. Mesmo padrão de "roda uma
// vez, só no desktop" já documentado em documents.spec.ts — a suíte
// completa (`npm run test:e2e`) espera um seed fresco.
test.describe("Qualificação (F4)", () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name !== "desktop-chromium", "usa fixtures fixas do seed — roda só uma vez, no desktop");
  });

  test("QSMS aprova normalmente quando não há pendência obrigatória, e o fornecedor vê o resultado publicado", async ({
    page,
  }) => {
    await login(page, QSMS.email, QSMS.password);
    await goToSupplier(page, /Beta/);

    // A 1ª rodada nasceu automaticamente ao validar o cadastro (RF-060).
    await expect(page.getByText("Em validação").first()).toBeVisible();

    await page.locator("#result").selectOption("APROVADO");
    await page.getByLabel(/Justificativa/).fill("PPRA/PGR aprovado e sem outras pendências obrigatórias.");
    await page.getByRole("button", { name: "Registrar decisão" }).click();

    await expect(page.getByText("Justificativa: PPRA/PGR aprovado e sem outras pendências obrigatórias.")).toBeVisible();
    await expect(page.getByText("Aprovado", { exact: true }).first()).toBeVisible();
    await page.getByRole("button", { name: "Sair" }).click();

    await login(page, BETA_ADMIN.email, BETA_ADMIN.password);
    await page.goto("/portal-fornecedor/qualificacao");
    await expect(page.getByText("Sua empresa está qualificada.")).toBeVisible();
    await expect(page.getByText("PPRA/PGR aprovado e sem outras pendências obrigatórias.")).toBeVisible();
  });

  test("bloqueia aprovação normal com requisito obrigatório não atendido (RN-010) — exige ressalva ou reprovação", async ({
    page,
  }) => {
    await login(page, COMPRAS.email, COMPRAS.password);
    await goToSupplier(page, /Alfa/);

    await expect(page.getByText("Documentação pendente").first()).toBeVisible();
    await expect(page.getByText("ART de execução").first()).toBeVisible(); // listado como pendência obrigatória

    await expect(page.locator("#result option[value='APROVADO']")).toBeDisabled();

    await page.locator("#result").selectOption("APROVADO_COM_RESSALVAS");
    await page.getByLabel(/Justificativa/).fill("ART rejeitado, mas serviço já iniciou por urgência operacional.");
    await page.getByLabel("Condição").fill("Reenviar ART corrigida em até 15 dias.");
    await page.locator("#conditionDeadline").fill("2026-10-01");
    await page.getByRole("button", { name: "Registrar decisão" }).click();

    await expect(page.getByText("Condição: Reenviar ART corrigida em até 15 dias.")).toBeVisible();
    await expect(page.getByText("Aprovado com ressalvas").first()).toBeVisible();
  });

  test("reprovação e requalificação preservam a rodada anterior (RF-065) — Gama", async ({ page }) => {
    await login(page, COMPRAS.email, COMPRAS.password);
    await goToSupplier(page, /Gama/);

    // Gama já chega do seed com rodada 1 aberta e toda a documentação pendente.
    await expect(page.getByText("Documentação pendente").first()).toBeVisible();

    await page.locator("#result").selectOption("REPROVADO");
    await page.getByLabel(/Justificativa/).fill("Nenhum documento obrigatório enviado até o momento.");
    await page.getByRole("button", { name: "Registrar decisão" }).click();
    await expect(page.getByText("Reprovado", { exact: true }).first()).toBeVisible();

    await page.getByRole("button", { name: "Iniciar nova rodada (requalificação)" }).click();
    await page.getByLabel(/Motivo da requalificação/).fill("Fornecedor solicitou nova avaliação após regularização.");
    await page.getByRole("button", { name: "Confirmar" }).click();

    await expect(page.getByText("Em requalificação").first()).toBeVisible();
    await expect(page.getByText("Rodada 2", { exact: false }).first()).toBeVisible();
    // A rodada 1 (reprovada) continua visível no histórico — nunca é apagada.
    await expect(page.getByText("Rodada 1", { exact: false }).first()).toBeVisible();
  });
});
