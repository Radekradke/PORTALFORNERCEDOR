import { NextResponse } from "next/server";
import { main as runSeed } from "../../../../../prisma/seed";

/**
 * Rota TEMPORÁRIA — existe só pra destravar o seed inicial de um ambiente
 * de teste sem acesso de rede direto ao banco de fora da Vercel (ver
 * conversa de deploy). Protegida por token em variável de ambiente
 * (`SEED_TOKEN`), nunca commitado. REMOVER depois do uso único.
 *
 * Nunca faz parte do fluxo normal do produto: não é referenciada em nenhum
 * lugar da UI, e usa dados fictícios (mesmo seed de desenvolvimento local).
 */
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token");
  const expected = process.env.SEED_TOKEN;

  if (!expected) {
    return NextResponse.json({ error: "SEED_TOKEN não configurado no ambiente." }, { status: 500 });
  }
  if (!token || token !== expected) {
    return NextResponse.json({ error: "Token inválido." }, { status: 403 });
  }

  const logs: string[] = [];
  const originalLog = console.log;
  console.log = (...args: unknown[]) => {
    logs.push(args.map(String).join(" "));
    originalLog(...args);
  };

  try {
    await runSeed();
    return NextResponse.json({ status: "ok", logs });
  } catch (error) {
    return NextResponse.json({ status: "error", message: (error as Error).message, logs }, { status: 500 });
  } finally {
    console.log = originalLog;
  }
}
