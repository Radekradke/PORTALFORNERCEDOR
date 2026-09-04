/**
 * Rate limiter em memória para endpoints abusáveis (login, recuperação de
 * senha), conforme "Segurança mínima inegociável" do PROMPT_MESTRE_CLAUDE.md.
 *
 * LIMITAÇÃO CONHECIDA (documentada, não escondida): esta implementação é por
 * processo. Em uma implantação com múltiplas instâncias, cada instância tem
 * sua própria janela. O bloqueio de conta por tentativas inválidas (RF-008),
 * que é o controle de segurança crítico, está em User.failedLoginCount/
 * lockedUntil no banco e por isso é consistente entre instâncias. Este
 * limiter é uma camada adicional de mitigação de força bruta por IP/chave.
 * TODO(decisao-negocio): política de rate limit distribuído (ex.: Redis) fica
 * para quando houver ambiente de produção definido (ver D-13).
 */

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterMs: number;
}

export function checkRateLimit(key: string, max: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  const existing = buckets.get(key);

  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: max - 1, retryAfterMs: 0 };
  }

  if (existing.count >= max) {
    return { allowed: false, remaining: 0, retryAfterMs: existing.resetAt - now };
  }

  existing.count += 1;
  return { allowed: true, remaining: max - existing.count, retryAfterMs: 0 };
}

// Evita crescimento indefinido do Map em processos de longa duração.
setInterval(
  () => {
    const now = Date.now();
    for (const [key, bucket] of buckets) {
      if (bucket.resetAt <= now) buckets.delete(key);
    }
  },
  10 * 60 * 1000,
).unref?.();
