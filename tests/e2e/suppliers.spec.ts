import { test, expect } from "@playwright/test";

// Depende do seed padrão (prisma/seed.ts) rodando contra um banco local limpo,
// e do Mailpit acessível em http://localhost:8025 (docker-compose.yml).
const COMPRAS = { email: "compras@lifting.local", password: "Compras#2026Local" };
const QSMS = { email: "qsms@lifting.local", password: "Qsms#2026Local" };

function genCnpj(base12: string): string {
  const W1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const W2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const calc = (digits: string, weights: number[]) => {
    const sum = weights.reduce((acc, w, i) => acc + w * Number(digits[i]), 0);
    const r = sum % 11;
    return r < 2 ? 0 : 11 - r;
  };
  const d1 = calc(base12, W1);
  const d2 = calc(base12 + d1, W2);
  return `${base12}${d1}${d2}`;
}

async function login(page: import("@playwright/test").Page, email: string, password: string) {
  await page.goto("/login");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill(password);
  await page.getByRole("button", { name: "Entrar" }).click();
  // Aguarda a navegação pós-login terminar antes de prosseguir (evita corrida
  // entre o redirect do Server Action e o próximo page.goto do teste).
  await page.waitForURL(/\/(dashboard|portal-fornecedor)/, { timeout: 15000 });
}

test.describe("Fornecedores (F2)", () => {
  test("Compras vê a lista com os fornecedores semeados", async ({ page }) => {
    await login(page, COMPRAS.email, COMPRAS.password);
    await page.goto("/fornecedores");
    await expect(page.getByText(/Alfa/).first()).toBeVisible();
    await expect(page.getByText(/Beta/).first()).toBeVisible();
    await expect(page.getByText(/Gama/).first()).toBeVisible();
  });

  test("CNPJ inválido e CNPJ duplicado são bloqueados (CA-01)", async ({ page }) => {
    await login(page, COMPRAS.email, COMPRAS.password);
    await page.goto("/fornecedores/novo");

    await page.getByLabel("CNPJ").fill("11.111.111/1111-11");
    await page.getByLabel("Razão social").fill("Fornecedor Teste Invalido");
    await page.getByLabel("Contato principal").fill("Contato Teste");
    await page.getByLabel("E-mail do contato").fill(`invalido-${Date.now()}@teste.local`);
    await page.locator("#criticality").selectOption("BAIXA");
    await page.locator('input[name="categoryIds"]').first().check();
    await page.getByRole("button", { name: "Criar e enviar convite" }).click();
    await expect(page.getByText("CNPJ inválido")).toBeVisible();

    // CNPJ de um fornecedor já semeado (Alfa)
    await page.getByLabel("CNPJ").fill("11.000.001/0001-52");
    await page.getByRole("button", { name: "Criar e enviar convite" }).click();
    await expect(page.getByText(/Já existe um fornecedor/)).toBeVisible();
  });

  test("convite -> ativação -> preenchimento -> envio para análise -> validação, com isolamento entre fornecedores", async ({
    page,
  }) => {
    const base12 = String(Date.now()).slice(-11).padStart(12, "0");
    const cnpj = genCnpj(base12);
    const email = `admin@e2e-${Date.now()}.local`;
    const password = "SenhaE2E#2026";

    // Compras convida
    await login(page, COMPRAS.email, COMPRAS.password);
    await page.goto("/fornecedores/novo");
    await page.getByLabel("CNPJ").fill(cnpj);
    await page.getByLabel("Razão social").fill("Fornecedor E2E Playwright Ltda");
    await page.getByLabel("Contato principal").fill("Contato E2E");
    await page.getByLabel("E-mail do contato").fill(email);
    await page.locator("#criticality").selectOption("BAIXA");
    await page.locator('input[name="categoryIds"]').first().check();
    await page.getByRole("button", { name: "Criar e enviar convite" }).click();
    await page.waitForURL(/\/fornecedores\/(?!novo)[a-z0-9]+$/);
    const supplierId = page.url().split("/").pop();

    await page.getByRole("button", { name: "Sair" }).click();

    // Busca o link de ativação no Mailpit
    const mailRes = await page.request.get("http://localhost:8025/api/v1/messages?limit=5");
    const mailData = await mailRes.json();
    const invite = mailData.messages.find((m: { To: { Address: string }[] }) =>
      m.To.some((t) => t.Address === email),
    );
    expect(invite, "e-mail de convite deve chegar ao Mailpit").toBeTruthy();

    const fullRes = await page.request.get(`http://localhost:8025/api/v1/message/${invite.ID}`);
    const full = await fullRes.json();
    const token = full.Text.match(/token=([A-Za-z0-9_-]+)/)?.[1];
    expect(token, "token deve ser extraível do corpo do e-mail").toBeTruthy();

    // Ativa a conta
    await page.goto(`/redefinir-senha?token=${token}`);
    await page.getByLabel("Nova senha", { exact: true }).fill(password);
    await page.getByLabel("Confirmar nova senha").fill(password);
    await page.getByRole("button", { name: "Definir senha" }).click();
    await expect(page.getByText(/sucesso/)).toBeVisible();

    // Login do fornecedor cai no portal externo
    await login(page, email, password);
    await expect(page).toHaveURL(/\/portal-fornecedor$/);

    // Preenche endereço e envia para análise
    await page.goto("/portal-fornecedor/empresa");
    await page.getByLabel("CEP").fill("04000-000");
    await page.getByLabel("Logradouro").fill("Rua Playwright");
    await page.getByLabel("Cidade").fill("São Paulo");
    await page.getByLabel("UF").fill("SP");
    await page.getByRole("button", { name: "Salvar rascunho" }).click();
    await expect(page.getByText("Dados salvos.")).toBeVisible();

    await page.getByRole("button", { name: "Enviar cadastro para análise" }).click();
    await page.goto("/portal-fornecedor");
    await expect(page.getByText(/análise/).first()).toBeVisible();

    // Isolamento: fornecedor não acessa área interna nem outro fornecedor por URL direta
    await page.goto("/fornecedores");
    await expect(page).not.toHaveURL(/\/fornecedores$/);

    await page.getByRole("button", { name: "Sair" }).click();

    // Compras valida o cadastro
    await login(page, COMPRAS.email, COMPRAS.password);
    await page.goto(`/fornecedores/${supplierId}`);
    await page.getByRole("button", { name: "Iniciar análise" }).click();
    await page.getByRole("button", { name: "Confirmar" }).click();
    await expect(page.getByRole("button", { name: "Validar cadastro" })).toBeVisible();
    await page.getByRole("button", { name: "Validar cadastro" }).click();
    await page.getByRole("button", { name: "Confirmar" }).click();
    await expect(page.getByText("Cadastro validado")).toBeVisible();
  });

  test("permissão sensível: QSMS bloqueia e Compras desbloqueia fornecedor (permissões concedidas no seed)", async ({
    page,
  }) => {
    await login(page, COMPRAS.email, COMPRAS.password);
    await page.goto("/fornecedores");
    await page.getByRole("link", { name: /Alfa/ }).click();
    await page.waitForURL(/\/fornecedores\/(?!novo)[a-z0-9]+$/);
    const supplierId = page.url().split("/").pop();
    await page.getByRole("button", { name: "Sair" }).click();

    await login(page, QSMS.email, QSMS.password);
    await page.goto(`/fornecedores/${supplierId}`);
    await page.getByRole("button", { name: "Bloquear" }).click();
    await page.getByLabel(/Motivo do bloqueio/).fill("Teste automatizado de bloqueio (Playwright).");
    await page.getByRole("button", { name: "Confirmar" }).click();
    await expect(page.getByText("Bloqueado")).toBeVisible();
    await page.getByRole("button", { name: "Sair" }).click();

    await login(page, COMPRAS.email, COMPRAS.password);
    await page.goto(`/fornecedores/${supplierId}`);
    await page.getByRole("button", { name: /Desbloquear/ }).click();
    await page.getByLabel(/Motivo do desbloqueio/).fill("Teste automatizado de desbloqueio (Playwright).");
    await page.getByRole("button", { name: "Confirmar" }).click();
    await expect(page.getByText("Regular")).toBeVisible();
  });
});
