/**
 * Validação de arquivo no servidor (RF-040, RNF-003): nunca confiar apenas
 * na extensão ou no Content-Type declarado pelo navegador — o "nome de
 * arquivo não determina o tipo". Aqui conferimos a assinatura binária
 * (magic bytes) dos três formatos aceitos no MVP (PDF, JPG, PNG).
 */

export type DetectedFileType = "PDF" | "JPG" | "PNG";

const MIME_BY_TYPE: Record<DetectedFileType, string> = {
  PDF: "application/pdf",
  JPG: "image/jpeg",
  PNG: "image/png",
};

export function mimeTypeFor(type: DetectedFileType): string {
  return MIME_BY_TYPE[type];
}

/** Detecta o tipo real do arquivo pelos primeiros bytes, ignorando o que o cliente declarou. */
export function detectFileType(buffer: Buffer): DetectedFileType | null {
  if (buffer.length >= 4 && buffer.subarray(0, 4).toString("ascii") === "%PDF") {
    return "PDF";
  }
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "JPG";
  }
  const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(PNG_SIGNATURE)) {
    return "PNG";
  }
  return null;
}

export interface FileValidationResult {
  ok: boolean;
  error?: string;
  detectedType?: DetectedFileType;
}

/**
 * `allowedFormats` restringe ainda mais o teto global (RF-031 por tipo de
 * requisito); vazio/undefined = aceita qualquer um dos três formatos globais.
 */
export function validateUploadedFile(
  buffer: Buffer,
  maxSizeBytes: number,
  allowedFormats?: string[],
): FileValidationResult {
  if (buffer.length === 0) {
    return { ok: false, error: "O arquivo está vazio." };
  }
  if (buffer.length > maxSizeBytes) {
    const maxMb = Math.round(maxSizeBytes / (1024 * 1024));
    return { ok: false, error: `Arquivo maior que o limite permitido (${maxMb} MB).` };
  }

  const detected = detectFileType(buffer);
  if (!detected) {
    return { ok: false, error: "Formato não reconhecido. Envie PDF, JPG ou PNG." };
  }

  if (allowedFormats && allowedFormats.length > 0 && !allowedFormats.includes(detected)) {
    return {
      ok: false,
      error: `Este requisito aceita apenas: ${allowedFormats.join(", ")}.`,
    };
  }

  return { ok: true, detectedType: detected };
}
