/**
 * Utilidades de CNPJ — normalização, formatação e validação de dígito
 * verificador (algoritmo público, mod 11). Isto NÃO é consulta automática de
 * CNPJ (RF: fora do escopo v0.1): não há chamada externa, apenas validação
 * matemática local do número informado manualmente.
 */

/** Mantém somente dígitos. RN-001: o CNPJ é armazenado normalizado. */
export function normalizeCnpj(value: string): string {
  return value.replace(/\D/g, "");
}

export function formatCnpj(value: string): string {
  const digits = normalizeCnpj(value);
  if (digits.length !== 14) return value;
  return digits.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
}

function calculateCheckDigit(digits: string, weights: number[]): number {
  const sum = weights.reduce((acc, weight, index) => acc + weight * Number(digits[index]), 0);
  const remainder = sum % 11;
  return remainder < 2 ? 0 : 11 - remainder;
}

const FIRST_WEIGHTS = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
const SECOND_WEIGHTS = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

export function isValidCnpj(value: string): boolean {
  const digits = normalizeCnpj(value);
  if (digits.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(digits)) return false; // todos os dígitos iguais

  const firstCheck = calculateCheckDigit(digits, FIRST_WEIGHTS);
  if (firstCheck !== Number(digits[12])) return false;

  const secondCheck = calculateCheckDigit(digits, SECOND_WEIGHTS);
  if (secondCheck !== Number(digits[13])) return false;

  return true;
}
