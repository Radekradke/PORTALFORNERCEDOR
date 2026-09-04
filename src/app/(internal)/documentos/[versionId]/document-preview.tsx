import { Button } from "@/components/ui/button";

/**
 * RF-045: pré-visualiza quando possível, senão oferece download autorizado.
 * A rota /api/documentos/[versionId]/download confere permissão no servidor
 * e redireciona para uma URL assinada temporária — nunca expõe a chave real.
 */
export function DocumentPreview({ versionId, mimeType }: { versionId: string; mimeType: string }) {
  const downloadUrl = `/api/documentos/${versionId}/download`;

  if (mimeType === "image/jpeg" || mimeType === "image/png") {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={downloadUrl} alt="Pré-visualização do documento" className="max-h-[480px] w-full rounded-md border object-contain" />;
  }

  if (mimeType === "application/pdf") {
    return (
      <div className="flex flex-col gap-2">
        <iframe src={downloadUrl} title="Pré-visualização do documento" className="h-[480px] w-full rounded-md border" />
        <Button asChild variant="outline" size="sm" className="self-start">
          <a href={downloadUrl} target="_blank" rel="noreferrer">
            Abrir em nova aba
          </a>
        </Button>
      </div>
    );
  }

  return (
    <Button asChild variant="outline">
      <a href={downloadUrl} target="_blank" rel="noreferrer">
        Baixar arquivo
      </a>
    </Button>
  );
}
