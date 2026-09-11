import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Sem isso, o Next tenta congelar a resposta em build time (mesmo bug já
// corrigido nas rotas de download/exportação) — e um health check cacheado
// pra sempre é inútil por definição, além de rodar a query contra o banco
// durante o build, antes de qualquer variável de ambiente real existir.
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ status: "ok", database: "up" });
  } catch (error) {
    return NextResponse.json(
      { status: "error", database: "down", message: (error as Error).message },
      { status: 503 },
    );
  }
}
