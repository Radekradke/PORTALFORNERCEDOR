import { NextResponse } from "next/server";
import { getCurrentActor } from "@/modules/auth-access/services/current-actor";
import { AuthorizationError } from "@/modules/auth-access/domain/authorize";
import { exportSuppliersCsv } from "@/modules/suppliers/services/supplier-service";

/** RF-115, CA-20: exporta exatamente os fornecedores da lista com os filtros atuais aplicados. */
export async function GET(request: Request) {
  const actor = await getCurrentActor();
  if (!actor) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const url = new URL(request.url);
  try {
    const csv = await exportSuppliersCsv(
      actor,
      {
        search: url.searchParams.get("busca") ?? undefined,
        registrationStatus: url.searchParams.get("status") ?? undefined,
      },
      {
        ip: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
        userAgent: request.headers.get("user-agent"),
      },
    );

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="fornecedores.csv"',
      },
    });
  } catch (err) {
    if (err instanceof AuthorizationError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    throw err;
  }
}
