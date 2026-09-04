import path from "node:path";
import { test, expect } from "@playwright/test";

const COMPRAS = { email: "compras@lifting.local", password: "Compras#2026Local" };
const QSMS = { email: "qsms@lifting.local", password: "Qsms#2026Local" };
const BETA_ADMIN = { email: "admin@beta-servicos.local", password: "Beta#2026Local" };
const ALFA_ADMIN = { email: "admin@alfa-materiais.local", password: "Alfa#2026Local" };

const SAMPLE_PDF = path.join(__dirname, "fixtures", "sample.pdf");

async function login(page: import("@playwright/test").Page, email: string, password: string) {
  await page.goto("/login");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill(password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL(/\/(dashboard|portal-fornecedor)/, { timeout: 15000 });
}

async function confirmInlineAction(page: import("@playwright/test").Page, buttonLabel: string | RegExp) {
  await page.getByRole("button", { name: buttonLabel }).click();
  await page.getByRole("button", { name: "Confirmar" }).click();
}

// Estes testes mutam fornecedores fixos do seed (Alfa/Beta) em sequência
// (validar cadastro, enviar/aprovar/rejeitar documento). Diferente de
// suppliers.spec.ts (que gera um CNPJ novo a cada execução), eles não são
// seguros para rodar duas vezes contra o mesmo banco — por isso rodam só no
// projeto desktop; a cobertura mobile de layout já vem de login.spec.ts e
// suppliers.spec.ts, que usam fixtures geradas dinamicamente.
test.describe("Requisitos e documentos (F3)", () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name !== "desktop-chromium", "usa fixtures fixas do seed — roda só uma vez, no desktop");
  });

  test("Compras valida cadastro, matriz gera requisitos, e a tela de requisitos lista o catálogo", async ({
    page,
  }) => {
    await login(page, COMPRAS.email, COMPRAS.password);

    await page.goto("/fornecedores");
    await page.getByRole("link", { name: /Beta/ }).click();
    await page.waitForURL(/\/fornecedores\/(?!novo)[a-z0-9]+$/);

    // Beta chega semeado em ENVIADO_PARA_ANALISE — valida o cadastro.
    if (await page.getByRole("button", { name: "Iniciar análise" }).count()) {
      await confirmInlineAction(page, "Iniciar análise");
    }
    await confirmInlineAction(page, "Validar cadastro");
    await expect(page.getByText("Cadastro validado")).toBeVisible();

    // RF-036: a matriz foi aplicada — deve aparecer um requisito pendente.
    await expect(page.getByText("PPRA / PGR").first()).toBeVisible();
    await expect(page.getByText("Pendente").first()).toBeVisible();

    await page.goto("/requisitos");
    await expect(page.getByText("ART", { exact: true })).toBeVisible();
    await expect(page.getByText("PPRA / PGR").first()).toBeVisible();
  });

  test("fornecedor envia documento, QSMS aprova, e o status vira Atendido", async ({ page }) => {
    await login(page, BETA_ADMIN.email, BETA_ADMIN.password);
    await page.goto("/portal-fornecedor/documentos");
    await expect(page.getByText("PPRA / PGR")).toBeVisible();

    await page.getByRole("button", { name: "Enviar nova versão" }).click();
    await page.locator('input[type="file"]').setInputFiles(SAMPLE_PDF);
    await page.locator('input[name="validUntil"]').fill("2027-06-30");
    await page.getByRole("button", { name: "Enviar" }).click();
    await expect(page.getByText("Aguardando análise").first()).toBeVisible();

    await page.getByRole("button", { name: "Sair" }).click();

    await login(page, QSMS.email, QSMS.password);
    await page.goto("/documentos");
    await expect(page.getByText("PPRA / PGR")).toBeVisible();
    await page.getByRole("link", { name: "PPRA / PGR" }).click();
    await page.waitForURL(/\/documentos\/[a-z0-9]+$/);

    await page.getByRole("button", { name: "Aprovar documento" }).click();
    await expect(page.getByText("Este documento já foi decidido.")).toBeVisible();

    await page.getByRole("button", { name: "Sair" }).click();

    await login(page, BETA_ADMIN.email, BETA_ADMIN.password);
    await page.goto("/portal-fornecedor/documentos");
    await expect(page.getByText("Atendido").first()).toBeVisible();
    await expect(page.getByText(/válida até/)).toBeVisible();
  });

  test("QSMS rejeita documento com motivo, visível ao fornecedor (RN-009)", async ({ page }) => {
    // Alfa chega semeado em "Em preenchimento" — completa e envia pelo portal externo.
    await login(page, ALFA_ADMIN.email, ALFA_ADMIN.password);
    await page.goto("/portal-fornecedor/empresa");
    await page.getByLabel("CEP").fill("05000-000");
    await page.getByLabel("Logradouro").fill("Rua Alfa Teste");
    await page.getByLabel("Cidade").fill("São Paulo");
    await page.getByLabel("UF").fill("SP");
    await page.getByRole("button", { name: "Salvar rascunho" }).click();
    await expect(page.getByText("Dados salvos.")).toBeVisible();
    await page.getByRole("button", { name: "Enviar cadastro para análise" }).click();
    await page.getByRole("button", { name: "Sair" }).click();

    // Compras valida o cadastro, o que aplica a matriz de requisitos do Alfa.
    await login(page, COMPRAS.email, COMPRAS.password);
    await page.goto("/fornecedores");
    await page.getByRole("link", { name: /Alfa/ }).click();
    await page.waitForURL(/\/fornecedores\/(?!novo)[a-z0-9]+$/);
    if (await page.getByRole("button", { name: "Iniciar análise" }).count()) {
      await confirmInlineAction(page, "Iniciar análise");
    }
    await confirmInlineAction(page, "Validar cadastro");
    await expect(page.getByText("Cadastro validado")).toBeVisible();
    await page.getByRole("button", { name: "Sair" }).click();

    // Fornecedor Alfa envia o ART (exige data de emissão).
    await login(page, ALFA_ADMIN.email, ALFA_ADMIN.password);
    await page.goto("/portal-fornecedor/documentos");
    await expect(page.getByText("ART de execução")).toBeVisible();

    const artCard = page
      .locator('[data-testid^="requirement-"]')
      .filter({ has: page.getByRole("heading", { name: "ART de execução" }) });
    await artCard.getByRole("button", { name: "Enviar nova versão" }).click();
    await artCard.locator('input[type="file"]').setInputFiles(SAMPLE_PDF);
    await artCard.locator('input[name="issuedAt"]').fill("2026-01-10");
    await artCard.getByRole("button", { name: "Enviar" }).click();
    await expect(page.getByText("Aguardando análise").first()).toBeVisible();
    await page.getByRole("button", { name: "Sair" }).click();

    // QSMS rejeita.
    await login(page, QSMS.email, QSMS.password);
    await page.goto("/documentos");
    await page.getByRole("link", { name: "ART de execução" }).click();
    await page.waitForURL(/\/documentos\/[a-z0-9]+$/);
    await page.getByRole("button", { name: "Rejeitar" }).click();
    await page.getByLabel(/Motivo \(visível ao fornecedor/).fill("Documento ilegível, favor reenviar.");
    await page.getByRole("button", { name: "Confirmar rejeição" }).click();
    await expect(page.getByText("Este documento já foi decidido.")).toBeVisible();
    await page.getByRole("button", { name: "Sair" }).click();

    // Fornecedor vê o motivo da rejeição.
    await login(page, ALFA_ADMIN.email, ALFA_ADMIN.password);
    await page.goto("/portal-fornecedor/documentos");
    await expect(page.getByText("Documento ilegível, favor reenviar.")).toBeVisible();
    await expect(page.getByText("Rejeitado").first()).toBeVisible();
  });

  test("isolamento: fornecedor não baixa documento de outro fornecedor por URL direta", async ({ page, request }) => {
    // Descobre um versionId real do fornecedor Beta (logado como QSMS).
    await login(page, QSMS.email, QSMS.password);
    await page.goto("/documentos");
    const link = page.getByRole("link", { name: "PPRA / PGR" });
    let versionId: string | null = null;
    if (await link.count()) {
      await link.click();
      await page.waitForURL(/\/documentos\/[a-z0-9]+$/);
      versionId = page.url().split("/").pop()!;
    }
    await page.getByRole("button", { name: "Sair" }).click();

    if (versionId) {
      await login(page, ALFA_ADMIN.email, ALFA_ADMIN.password);
      const response = await page.request.get(`/api/documentos/${versionId}/download`, {
        maxRedirects: 0,
      });
      expect([401, 403]).toContain(response.status());
    }
  });
});
