import { test, expect } from "@playwright/test";

// Depende do seed padrão (prisma/seed.ts) rodando contra um banco local limpo,
// e do Mailpit acessível em http://localhost:8025 (docker-compose.yml).
const COMPRAS = { email: "compras@lifting.local", password: "Compras#2026Local" };
const QSMS = { email: "qsms@lifting.local", password: "Qsms#2026Local" };
// Beta é seeded REGULAR e sua situação operacional não é usada por nenhum
// outro arquivo de teste (Alfa é o fornecedor que suppliers.spec.ts usa
// para o próprio teste de bloqueio/desbloqueio — reaproveitá-lo aqui geraria
// um "Bloquear" que nunca mais volta a existir para aquele teste, já que os
// specs rodam em sequência contra o mesmo banco).
const BETA_ADMIN = { email: "admin@beta-servicos.local", password: "Beta#2026Local" };

async function login(page: import("@playwright/test").Page, email: string, password: string) {
  await page.goto("/login");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill(password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL(/\/(dashboard|portal-fornecedor)/, { timeout: 15000 });
}

test.describe("Dashboard e notificações (F7)", () => {
  test("dashboard mostra indicadores gerais, fila pessoal e ICO médio (RF-110 a RF-113, CA-17)", async ({ page }) => {
    await login(page, COMPRAS.email, COMPRAS.password);
    await page.goto("/dashboard");

    await expect(page.getByText("Fornecedores ativos")).toBeVisible();
    await expect(page.getByText("NCs abertas")).toBeVisible();
    await expect(page.getByText(/ICO médio/)).toBeVisible();

    // CA-17: o cartão de KPI leva à lista já filtrada correspondente.
    await page.getByText("Fornecedores ativos").click();
    await page.waitForURL(/\/fornecedores\?status=CADASTRO_VALIDADO/);
    await expect(page.getByText(/Gama/).first()).toBeVisible();
  });

  test("exportação CSV respeita filtro atual e fica registrada em auditoria (RF-115, CA-20)", async ({ page }) => {
    await login(page, COMPRAS.email, COMPRAS.password);
    await page.goto("/fornecedores?busca=Gama");

    const exportLink = page.getByRole("link", { name: "Exportar CSV" });
    await expect(exportLink).toBeVisible();
    const href = await exportLink.getAttribute("href");
    expect(href).toContain("busca=Gama");

    const response = await page.request.get(href!);
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toContain("text/csv");
    const body = await response.text();
    expect(body).toContain("Gama Industrial");
    expect(body).not.toContain("Alfa Materiais"); // filtro aplicado — não vaza outros fornecedores
  });

  test("bloqueio de fornecedor gera notificação e e-mail para o fornecedor (RF-116, RF-117, RN-022)", async ({
    page,
  }) => {
    // QSMS bloqueia a Beta Serviços (seeded REGULAR).
    await login(page, QSMS.email, QSMS.password);
    await page.goto("/fornecedores");
    await page.getByRole("link", { name: /Beta/ }).click();
    await page.waitForURL(/\/fornecedores\/(?!novo)[a-z0-9]+$/);
    await page.getByRole("button", { name: "Bloquear" }).click();
    await page.getByLabel(/Motivo do bloqueio/).fill("Teste automatizado F7 — verificação de notificação.");
    await page.getByRole("button", { name: "Confirmar" }).click();
    await expect(page.getByText("Bloqueado")).toBeVisible();
    await page.getByRole("button", { name: "Sair" }).click();

    // O fornecedor vê o alerta no sino e na central de notificações.
    await login(page, BETA_ADMIN.email, BETA_ADMIN.password);
    await expect(page.getByRole("link", { name: /Notificações/ }).first()).toBeVisible();
    await page.goto("/portal-fornecedor/notificacoes");
    await expect(page.getByText("Fornecedor bloqueado").first()).toBeVisible();
    await expect(page.getByText(/Teste automatizado F7/).first()).toBeVisible();

    await page.getByRole("button", { name: "Marcar como lida" }).first().click();
    await expect(page.getByRole("button", { name: "Marcar como lida" })).toHaveCount(0);

    // RF-117: e-mail transacional chega ao Mailpit (best-effort, fora da transação).
    const mailRes = await page.request.get("http://localhost:8025/api/v1/messages?limit=10");
    const mailData = await mailRes.json();
    const alert = mailData.messages.find(
      (m: { To: { Address: string }[]; Subject: string }) =>
        m.To.some((t) => t.Address === BETA_ADMIN.email) && m.Subject.includes("Fornecedor bloqueado"),
    );
    expect(alert, "e-mail de bloqueio deve chegar ao Mailpit").toBeTruthy();
  });
});
