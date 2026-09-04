import { hash, verify } from "@node-rs/argon2";

// Parâmetros Argon2id acima do mínimo recomendado (OWASP) para uso em servidor único.
const ARGON2_OPTIONS = {
  algorithm: 2, // Argon2id
  memoryCost: 19456, // ~19 MiB
  timeCost: 2,
  parallelism: 1,
} as const;

export async function hashPassword(plain: string): Promise<string> {
  return hash(plain, ARGON2_OPTIONS);
}

export async function verifyPassword(hashValue: string, plain: string): Promise<boolean> {
  try {
    return await verify(hashValue, plain);
  } catch {
    // hash malformado/corrompido nunca deve derrubar o login - trata como inválido.
    return false;
  }
}

const PASSWORD_MIN_LENGTH = 10;

export function isPasswordStrongEnough(plain: string): boolean {
  if (plain.length < PASSWORD_MIN_LENGTH) return false;
  const hasLetter = /[a-zA-Z]/.test(plain);
  const hasNumberOrSymbol = /[0-9]/.test(plain) || /[^a-zA-Z0-9]/.test(plain);
  return hasLetter && hasNumberOrSymbol;
}

export { PASSWORD_MIN_LENGTH };
