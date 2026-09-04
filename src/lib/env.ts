import { z } from "zod";

/**
 * Valida as variáveis de ambiente na inicialização. A aplicação deve falhar
 * cedo quando uma variável obrigatória estiver ausente (arquitetar-stack-free).
 */
const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),

  APP_URL: z.string().url().default("http://localhost:3000"),
  APP_TIMEZONE: z.string().default("America/Sao_Paulo"),

  DATABASE_URL: z.string().min(1, "DATABASE_URL é obrigatória"),

  SESSION_COOKIE_NAME: z.string().default("portal_session"),
  SESSION_TTL_HOURS: z.coerce.number().int().positive().default(12),

  LOGIN_MAX_ATTEMPTS: z.coerce.number().int().positive().default(5),
  LOGIN_LOCK_MINUTES: z.coerce.number().int().positive().default(15),
  PASSWORD_RESET_TTL_MINUTES: z.coerce.number().int().positive().default(60),

  STORAGE_ENDPOINT: z.string().default("http://localhost:9000"),
  STORAGE_REGION: z.string().default("us-east-1"),
  STORAGE_ACCESS_KEY_ID: z.string().default(""),
  STORAGE_SECRET_ACCESS_KEY: z.string().default(""),
  STORAGE_BUCKET: z.string().default("portal-fornecedores-documentos"),
  STORAGE_FORCE_PATH_STYLE: z
    .string()
    .default("true")
    .transform((v) => v === "true"),

  // RF-040: tamanho máximo de upload configurável.
  MAX_UPLOAD_SIZE_MB: z.coerce.number().int().positive().default(15),

  MAIL_PROVIDER: z.enum(["smtp", "console"]).default("smtp"),
  SMTP_HOST: z.string().default("localhost"),
  SMTP_PORT: z.coerce.number().int().positive().default(1025),
  SMTP_SECURE: z
    .string()
    .default("false")
    .transform((v) => v === "true"),
  SMTP_USER: z.string().default(""),
  SMTP_PASSWORD: z.string().default(""),
  MAIL_FROM: z.string().default("Portal de Fornecedores <nao-responda@lifting.local>"),
});

type Env = z.infer<typeof envSchema>;

let cached: Env | undefined;

export function getEnv(): Env {
  if (cached) return cached;

  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `- ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");
    throw new Error(
      `Configuração de ambiente inválida. Corrija as variáveis abaixo (veja .env.example):\n${issues}`,
    );
  }

  cached = parsed.data;
  return cached;
}
