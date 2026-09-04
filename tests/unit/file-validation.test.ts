import { describe, expect, it } from "vitest";
import { detectFileType, validateUploadedFile } from "@/lib/file-validation";

const PDF_HEADER = Buffer.from("%PDF-1.4\n%âãÏÓ\n");
const JPG_HEADER = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
const PNG_HEADER = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const FAKE_EXE = Buffer.from([0x4d, 0x5a, 0x90, 0x00]); // assinatura de executável Windows

describe("detectFileType()", () => {
  it("reconhece PDF pelos primeiros bytes", () => {
    expect(detectFileType(PDF_HEADER)).toBe("PDF");
  });

  it("reconhece JPG pelos primeiros bytes", () => {
    expect(detectFileType(JPG_HEADER)).toBe("JPG");
  });

  it("reconhece PNG pelos primeiros bytes", () => {
    expect(detectFileType(PNG_HEADER)).toBe("PNG");
  });

  it("rejeita um formato não suportado mesmo que a extensão minta", () => {
    expect(detectFileType(FAKE_EXE)).toBeNull();
  });
});

describe("validateUploadedFile()", () => {
  const MAX_SIZE = 1024 * 1024;

  it("aceita um PDF dentro do limite", () => {
    const result = validateUploadedFile(PDF_HEADER, MAX_SIZE);
    expect(result.ok).toBe(true);
    expect(result.detectedType).toBe("PDF");
  });

  it("rejeita arquivo vazio", () => {
    const result = validateUploadedFile(Buffer.alloc(0), MAX_SIZE);
    expect(result.ok).toBe(false);
  });

  it("rejeita arquivo maior que o limite configurado", () => {
    const big = Buffer.concat([PDF_HEADER, Buffer.alloc(MAX_SIZE)]);
    const result = validateUploadedFile(big, MAX_SIZE);
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/limite/);
  });

  it("nunca confia na extensão: um .pdf falso com bytes de executável é recusado", () => {
    const result = validateUploadedFile(FAKE_EXE, MAX_SIZE);
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/formato/i);
  });

  it("restringe pelo allowedFormats do tipo de requisito", () => {
    const result = validateUploadedFile(JPG_HEADER, MAX_SIZE, ["PDF"]);
    expect(result.ok).toBe(false);
    expect(result.error).toContain("PDF");
  });

  it("aceita quando o formato detectado está entre os permitidos", () => {
    const result = validateUploadedFile(PNG_HEADER, MAX_SIZE, ["PDF", "PNG"]);
    expect(result.ok).toBe(true);
  });
});
