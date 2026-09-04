import { NextResponse } from "next/server";
import { getCurrentActor } from "@/modules/auth-access/services/current-actor";
import { AuthorizationError } from "@/modules/auth-access/domain/authorize";
import { getDownloadUrlForVersion, DocumentServiceError } from "@/modules/documents/services/document-service";

/**
 * Download privado (RF-045, RNF-003): confere organização/permissão no
 * servidor e só então assina uma URL temporária — nunca expõe a chave real
 * do storage nem serve o arquivo a partir de uma referência adivinhável.
 */
export async function GET(request: Request, { params }: { params: { versionId: string } }) {
  const actor = await getCurrentActor();
  if (!actor) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  try {
    const url = await getDownloadUrlForVersion(actor, params.versionId, {
      ip: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
      userAgent: request.headers.get("user-agent"),
    });
    return NextResponse.redirect(url);
  } catch (err) {
    if (err instanceof AuthorizationError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    if (err instanceof DocumentServiceError) {
      return NextResponse.json({ error: err.message }, { status: 404 });
    }
    throw err;
  }
}
