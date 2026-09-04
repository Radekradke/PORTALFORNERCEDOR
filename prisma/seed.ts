/**
 * Seed idempotente da fatia F0/F1.
 *
 * IMPORTANTE: todos os usuários abaixo são FICTÍCIOS, criados apenas para
 * desenvolvimento/homologação local (domínio *.local, senhas de exemplo).
 * Nunca reutilize estas credenciais fora do ambiente local.
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

  // Permissões sensíveis de exemplo: Compras decide qualificação; QSMS decide
  // qualificação e reabre NC (docs/REGRAS_FUNCIONAIS.md).
  const admin = byEmail.get("admin.ti@lifting.local")!;
  const compras = byEmail.get("compras@lifting.local")!;
  const qsms = byEmail.get("qsms@lifting.local")!;

  const grants: Array<{ userId: string; permission: "QUALIFICATION_DECIDE" | "SUPPLIER_SUSPEND" | "NC_REOPEN" }> = [
    { userId: compras.id, permission: "QUALIFICATION_DECIDE" },
    { userId: qsms.id, permission: "QUALIFICATION_DECIDE" },
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
