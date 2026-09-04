import { test, expect } from "@playwright/test";

// Depende do seed padrão (prisma/seed.ts) rodando contra um banco local limpo.
const ADMIN_EMAIL = "admin.ti@lifting.local";
const ADMIN_PASSWORD = "AdminTi#2026Local";

test.describe("Autenticação", () => {
  test("visitante não autenticado é redirecionado para /login", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login/);
  });

  test("login com credenciais inválidas mostra mensagem genérica", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("E-mail").fill(ADMIN_EMAIL);
    await page.getByLabel("Senha").fill("senha-errada-qualquer");
    await page.getByRole("button", { name: "Entrar" }).click();

    await expect(page.getByRole("alert").filter({ hasText: "inválidos" })).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
  });

  test("login com credenciais válidas acessa o dashboard e permite logout", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("E-mail").fill(ADMIN_EMAIL);
    await page.getByLabel("Senha").fill(ADMIN_PASSWORD);
    await page.getByRole("button", { name: "Entrar" }).click();

    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByText("Bem-vindo(a)")).toBeVisible();

    await page.getByRole("button", { name: "Sair" }).click();
    await expect(page).toHaveURL(/\/login/);

    // Sessão realmente encerrada no servidor: voltar ao dashboard exige login de novo.
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login/);
  });

  test("usuário sem permissão de Admin TI não acessa gestão de usuários (403 no servidor)", async ({
    page,
  }) => {
    await page.goto("/login");
    await page.getByLabel("E-mail").fill("compras@lifting.local");
    await page.getByLabel("Senha").fill("Compras#2026Local");
    await page.getByRole("button", { name: "Entrar" }).click();
    await expect(page).toHaveURL(/\/dashboard/);

    await page.goto("/usuarios");
    await expect(page.getByRole("alert").filter({ hasText: "não tem permissão" })).toBeVisible();
  });
});
