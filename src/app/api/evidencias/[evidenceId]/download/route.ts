import { NextResponse } from "next/server";
import { getCurrentActor } from "@/modules/auth-access/services/current-actor";
import { AuthorizationError } from "@/modules/auth-access/domain/authorize";
import { getEvidenceDownloadUrl, InspectionServiceError } from "@/modules/inspections/services/inspection-service";

/**
 * Download privado de evidência de fiscalização (RNF-003) — mesmo padrão do
 * download de documento: confere permissão no servidor e só então assina
 * uma URL temporária.
 */
export async function GET(request: Request, { params }: { params: { evidenceId: string } }) {
  const actor = await getCurrentActor();
  if (!actor) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  try {
    const url = await getEvidenceDownloadUrl(actor, params.evidenceId, {
      ip: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
      userAgent: request.headers.get("user-agent"),
    });
    return NextResponse.redirect(url);
  } catch (err) {
    if (err instanceof AuthorizationError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    if (err instanceof InspectionServiceError) {
      return NextResponse.json({ error: err.message }, { status: 404 });
    }
    throw err;
  }
}
