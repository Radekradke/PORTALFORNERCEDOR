/**
 * Seed idempotente das fatias F0/F1 (acesso) e F2 (fornecedores).
 *
 * IMPORTANTE: todos os usuários e fornecedores abaixo são FICTÍCIOS, criados
 * apenas para desenvolvimento/homologação local (domínio *.local, CNPJs
 * matematicamente válidos mas fictícios, senhas de exemplo). Nunca reutilize
 * estas credenciais ou CNPJs fora do ambiente local.
 *
 * Executa com: npm run prisma:seed
 */
import { PrismaClient } from "@prisma/client";
import { hash } from "@node-rs/argon2";

const prisma = new PrismaClient();

const ARGON2_OPTIONS = {
  algorithm: 2 as const, // Argon2id
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
};

async function hashPassword(plain: string): Promise<string> {
  return hash(plain, ARGON2_OPTIONS);
}

interface SeedUser {
  name: string;
  email: string;
  role: "ADMIN_TI" | "COMPRAS" | "QSMS";
  status: "ACTIVE" | "BLOCKED" | "INVITED";
  password?: string; // ausente = fica em INVITED (aguardando ativação)
}

const SEED_USERS: SeedUser[] = [
  {
    name: "Ana Ficticia (Admin TI)",
    email: "admin.ti@lifting.local",
    role: "ADMIN_TI",
    status: "ACTIVE",
    password: "AdminTi#2026Local",
  },
  {
    name: "Bruno Ficticio (Compras)",
    email: "compras@lifting.local",
    role: "COMPRAS",
    status: "ACTIVE",
    password: "Compras#2026Local",
  },
  {
    name: "Carla Ficticia (QSMS)",
    email: "qsms@lifting.local",
    role: "QSMS",
    status: "ACTIVE",
    password: "Qsms#2026Local",
  },
  {
    name: "Diego Ficticio (Compras bloqueado)",
    email: "compras.bloqueado@lifting.local",
    role: "COMPRAS",
    status: "BLOCKED",
    password: "Bloqueado#2026Local",
  },
  {
    name: "Elisa Ficticia (QSMS convite pendente)",
    email: "qsms.convite@lifting.local",
    role: "QSMS",
    status: "INVITED",
  },
];

async function main() {
  console.log("Seed: iniciando (dados fictícios, ambiente local)...");

  const byEmail = new Map<string, { id: string; role: SeedUser["role"] }>();

  for (const seedUser of SEED_USERS) {
    const passwordHash = seedUser.password ? await hashPassword(seedUser.password) : null;

    const user = await prisma.user.upsert({
      where: { email: seedUser.email },
      update: {
        name: seedUser.name,
        role: seedUser.role,
        status: seedUser.status,
        ...(passwordHash ? { passwordHash } : {}),
      },
      create: {
        name: seedUser.name,
        email: seedUser.email,
        role: seedUser.role,
        status: seedUser.status,
        passwordHash,
      },
    });

    byEmail.set(seedUser.email, { id: user.id, role: seedUser.role });
    console.log(`  usuário ok: ${seedUser.email} (${seedUser.role}/${seedUser.status})`);
  }

  // Permissões sensíveis de exemplo (docs/REGRAS_FUNCIONAIS.md): Compras
  // decide qualificação e desbloqueia; QSMS decide qualificação, bloqueia e
  // reabre NC. Cada permissão fica com um titular diferente de propósito,
  // para exercitar authorize() com granularidade real nos testes manuais.
  const admin = byEmail.get("admin.ti@lifting.local")!;
  const compras = byEmail.get("compras@lifting.local")!;
  const qsms = byEmail.get("qsms@lifting.local")!;

  const grants: Array<{
    userId: string;
    permission: "QUALIFICATION_DECIDE" | "SUPPLIER_SUSPEND" | "SUPPLIER_BLOCK" | "SUPPLIER_UNBLOCK" | "NC_REOPEN";
  }> = [
    { userId: compras.id, permission: "QUALIFICATION_DECIDE" },
    { userId: compras.id, permission: "SUPPLIER_SUSPEND" },
    { userId: compras.id, permission: "SUPPLIER_UNBLOCK" },
    { userId: qsms.id, permission: "QUALIFICATION_DECIDE" },
    { userId: qsms.id, permission: "SUPPLIER_BLOCK" },
    { userId: qsms.id, permission: "NC_REOPEN" },
  ];

  for (const grant of grants) {
    const existing = await prisma.userPermission.findFirst({
      where: { userId: grant.userId, permission: grant.permission, revokedAt: null },
    });
    if (!existing) {
      await prisma.userPermission.create({
        data: { userId: grant.userId, permission: grant.permission, grantedById: admin.id },
      });
      console.log(`  permissão concedida: ${grant.permission} -> ${grant.userId}`);
    }
  }

  // ---------------------------------------------------------------------
  // F2 — Categorias e fornecedores fictícios
  // ---------------------------------------------------------------------

  const categoriesData = [
    { code: "ELET", name: "Materiais elétricos", description: "Cabos, quadros, componentes elétricos." },
    { code: "SERV-MANUT", name: "Serviços de manutenção", description: "Manutenção predial e industrial." },
  ];

  const categoryIds = new Map<string, string>();
  for (const c of categoriesData) {
    const category = await prisma.category.upsert({
      where: { code: c.code },
      update: { name: c.name, description: c.description },
      create: c,
    });
    categoryIds.set(c.code, category.id);
    console.log(`  categoria ok: ${c.code}`);
  }

  interface SeedSupplier {
    cnpj: string;
    legalName: string;
    tradeName?: string;
    criticality: "BAIXA" | "MEDIA" | "ALTA" | "CRITICA";
    categoryCodes: string[];
    registrationStatus:
      | "EM_PREENCHIMENTO"
      | "ENVIADO_PARA_ANALISE"
      | "CADASTRO_VALIDADO";
    operationalStatus?: "REGULAR" | "BLOQUEADO";
    address?: {
      zip: string;
      street: string;
      number: string;
      district: string;
      city: string;
      state: string;
    };
    adminEmail: string;
    adminName: string;
    adminPassword: string;
  }

  const suppliersData: SeedSupplier[] = [
    {
      cnpj: "11000001000152",
      legalName: "Fornecedor Alfa Materiais Ltda (ficticio)",
      tradeName: "Alfa Materiais",
      criticality: "MEDIA",
      categoryCodes: ["ELET"],
      registrationStatus: "EM_PREENCHIMENTO",
      adminEmail: "admin@alfa-materiais.local",
      adminName: "Fábio Ficticio (Alfa)",
      adminPassword: "Alfa#2026Local",
    },
    {
      cnpj: "12000002000160",
      legalName: "Fornecedor Beta Serviços Ltda (ficticio)",
      tradeName: "Beta Serviços",
      criticality: "ALTA",
      categoryCodes: ["SERV-MANUT"],
      registrationStatus: "ENVIADO_PARA_ANALISE",
      address: {
        zip: "01000-000",
        street: "Rua Ficticia",
        number: "100",
        district: "Centro",
        city: "São Paulo",
        state: "SP",
      },
      adminEmail: "admin@beta-servicos.local",
      adminName: "Gisele Ficticia (Beta)",
      adminPassword: "Beta#2026Local",
    },
    {
      cnpj: "13000003000177",
      legalName: "Fornecedor Gama Industrial Ltda (ficticio)",
      tradeName: "Gama Industrial",
      criticality: "CRITICA",
      categoryCodes: ["ELET", "SERV-MANUT"],
      registrationStatus: "CADASTRO_VALIDADO",
      operationalStatus: "BLOQUEADO",
      address: {
        zip: "02000-000",
        street: "Avenida Ficticia",
        number: "500",
        district: "Industrial",
        city: "Guarulhos",
        state: "SP",
      },
      adminEmail: "admin@gama-industrial.local",
      adminName: "Hugo Ficticio (Gama)",
      adminPassword: "Gama#2026Local",
    },
  ];

  for (const s of suppliersData) {
    const existing = await prisma.supplier.findUnique({ where: { cnpj: s.cnpj } });
    const passwordHash = await hashPassword(s.adminPassword);

    const supplier = await prisma.supplier.upsert({
      where: { cnpj: s.cnpj },
      update: {
        legalName: s.legalName,
        tradeName: s.tradeName,
        criticality: s.criticality,
        registrationStatus: s.registrationStatus,
        operationalStatus: s.operationalStatus ?? "REGULAR",
        operationalReason: s.operationalStatus === "BLOQUEADO" ? "Pendência crítica de segurança (exemplo fictício de seed)." : null,
        addressZip: s.address?.zip,
        addressStreet: s.address?.street,
        addressNumber: s.address?.number,
        addressDistrict: s.address?.district,
        addressCity: s.address?.city,
        addressState: s.address?.state,
        submittedAt: s.registrationStatus !== "EM_PREENCHIMENTO" ? new Date() : null,
        validatedAt: s.registrationStatus === "CADASTRO_VALIDADO" ? new Date() : null,
      },
      create: {
        cnpj: s.cnpj,
        legalName: s.legalName,
        tradeName: s.tradeName,
        criticality: s.criticality,
        registrationStatus: s.registrationStatus,
        operationalStatus: s.operationalStatus ?? "REGULAR",
        operationalReason: s.operationalStatus === "BLOQUEADO" ? "Pendência crítica de segurança (exemplo fictício de seed)." : null,
        inviteSentAt: new Date(),
        addressZip: s.address?.zip,
        addressStreet: s.address?.street,
        addressNumber: s.address?.number,
        addressDistrict: s.address?.district,
        addressCity: s.address?.city,
        addressState: s.address?.state,
        submittedAt: s.registrationStatus !== "EM_PREENCHIMENTO" ? new Date() : null,
        validatedAt: s.registrationStatus === "CADASTRO_VALIDADO" ? new Date() : null,
      },
    });

    for (const code of s.categoryCodes) {
      const categoryId = categoryIds.get(code)!;
      await prisma.supplierCategory.upsert({
        where: { supplierId_categoryId: { supplierId: supplier.id, categoryId } },
        update: {},
        create: { supplierId: supplier.id, categoryId },
      });
    }

    if (!existing) {
      await prisma.supplierContact.create({
        data: {
          supplierId: supplier.id,
          name: s.adminName,
          email: s.adminEmail,
          contactType: "COMERCIAL",
          isPrimary: true,
        },
      });
    }

    await prisma.user.upsert({
      where: { email: s.adminEmail },
      update: { name: s.adminName, role: "FORNECEDOR_ADMIN", status: "ACTIVE", supplierId: supplier.id, passwordHash },
      create: {
        name: s.adminName,
        email: s.adminEmail,
        role: "FORNECEDOR_ADMIN",
        status: "ACTIVE",
        supplierId: supplier.id,
        passwordHash,
      },
    });

    console.log(`  fornecedor ok: ${s.legalName} (${s.registrationStatus})`);
  }

  // ---------------------------------------------------------------------
  // F3 — Tipos de documento e matriz de requisitos
  // ---------------------------------------------------------------------

  const requirementTypesData = [
    {
      code: "ART",
      name: "ART de execução",
      description: "Anotação de Responsabilidade Técnica da execução do serviço.",
      allowedFormats: ["PDF"],
      validityType: "FIXA" as const,
      validityDays: 365,
      needsIssueDate: true,
    },
    {
      code: "PPRA-PGR",
      name: "PPRA / PGR",
      description: "Programa de Gerenciamento de Riscos vigente.",
      allowedFormats: [] as string[],
      validityType: "INFORMADA" as const,
      validityDays: null as number | null,
      needsIssueDate: false,
    },
    {
      code: "ALVARA",
      name: "Alvará de funcionamento",
      description: "Alvará municipal de funcionamento.",
      allowedFormats: [] as string[],
      validityType: "SEM_VENCIMENTO" as const,
      validityDays: null as number | null,
      needsIssueDate: false,
    },
  ];

  const requirementTypeIds = new Map<string, string>();
  for (const rt of requirementTypesData) {
    const type = await prisma.requirementType.upsert({
      where: { code: rt.code },
      update: {
        name: rt.name,
        description: rt.description,
        allowedFormats: rt.allowedFormats,
        validityType: rt.validityType,
        validityDays: rt.validityDays,
        needsIssueDate: rt.needsIssueDate,
      },
      create: rt,
    });
    requirementTypeIds.set(rt.code, type.id);
    console.log(`  tipo de documento ok: ${rt.code}`);
  }

  interface SeedRule {
    typeCode: string;
    categoryCode: string;
    criticalities: Array<"BAIXA" | "MEDIA" | "ALTA" | "CRITICA">;
    obligation: "OBRIGATORIO" | "CONDICIONAL" | "INFORMATIVO";
  }

  const rulesData: SeedRule[] = [
    { typeCode: "ART", categoryCode: "ELET", criticalities: ["MEDIA", "ALTA", "CRITICA"], obligation: "OBRIGATORIO" },
    { typeCode: "PPRA-PGR", categoryCode: "SERV-MANUT", criticalities: ["ALTA", "CRITICA"], obligation: "OBRIGATORIO" },
    {
      typeCode: "ALVARA",
      categoryCode: "ELET",
      criticalities: ["BAIXA", "MEDIA", "ALTA", "CRITICA"],
      obligation: "INFORMATIVO",
    },
  ];

  const ruleIds = new Map<string, string>();
  for (const r of rulesData) {
    const requirementTypeId = requirementTypeIds.get(r.typeCode)!;
    const categoryId = categoryIds.get(r.categoryCode)!;
    const existingRule = await prisma.requirementRule.findFirst({
      where: { requirementTypeId, categoryId },
    });
    const rule = existingRule
      ? await prisma.requirementRule.update({
          where: { id: existingRule.id },
          data: { criticalities: r.criticalities, obligation: r.obligation, active: true },
        })
      : await prisma.requirementRule.create({
          data: { requirementTypeId, categoryId, criticalities: r.criticalities, obligation: r.obligation },
        });
    ruleIds.set(`${r.typeCode}:${r.categoryCode}`, rule.id);
    console.log(`  regra ok: ${r.typeCode} x ${r.categoryCode}`);
  }

  // Fornecedor Gama já está com cadastro validado no seed acima; aplicamos a
  // matriz diretamente aqui (o serviço applyRequirementMatrix é acionado
  // automaticamente pela tela quando a validação acontece pela interface —
  // o seed grava direto no banco, então replica o resultado esperado).
  const gama = await prisma.supplier.findUnique({ where: { cnpj: "13000003000177" } });
  if (gama) {
    const gamaRequirements: Array<{ typeCode: string; ruleKey: string; obligation: SeedRule["obligation"] }> = [
      { typeCode: "ART", ruleKey: "ART:ELET", obligation: "OBRIGATORIO" },
      { typeCode: "PPRA-PGR", ruleKey: "PPRA-PGR:SERV-MANUT", obligation: "OBRIGATORIO" },
      { typeCode: "ALVARA", ruleKey: "ALVARA:ELET", obligation: "INFORMATIVO" },
    ];
    for (const gr of gamaRequirements) {
      const requirementTypeId = requirementTypeIds.get(gr.typeCode)!;
      await prisma.supplierRequirement.upsert({
        where: { supplierId_requirementTypeId: { supplierId: gama.id, requirementTypeId } },
        update: { obligation: gr.obligation, sourceRuleId: ruleIds.get(gr.ruleKey), active: true },
        create: {
          supplierId: gama.id,
          requirementTypeId,
          obligation: gr.obligation,
          sourceRuleId: ruleIds.get(gr.ruleKey),
        },
      });
    }
    console.log("  matriz aplicada ao fornecedor Gama Industrial");
  }

  console.log("Seed: concluído.");
}

main()
  .catch((error) => {
    console.error("Seed falhou:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
