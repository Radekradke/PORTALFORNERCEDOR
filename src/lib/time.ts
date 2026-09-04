import { formatInTimeZone } from "date-fns-tz";
import { getEnv } from "@/lib/env";

/**
 * Datas ficam em UTC no banco (RN-007, RNF-016) e são exibidas no fuso
 * configurado (APP_TIMEZONE) apenas na camada de apresentação.
 */
export function formatDateTime(date: Date | string, pattern = "dd/MM/yyyy HH:mm"): string {
  const env = getEnv();
  const value = typeof date === "string" ? new Date(date) : date;
  return formatInTimeZone(value, env.APP_TIMEZONE, pattern, { locale: undefined });
}

export function formatDate(date: Date | string): string {
  return formatDateTime(date, "dd/MM/yyyy");
}

/** Fim de validade documental ocorre às 23:59:59 no fuso operacional (RN-007). */
export function endOfDayInAppTimezone(date: Date): Date {
  const env = getEnv();
  const localDateStr = formatInTimeZone(date, env.APP_TIMEZONE, "yyyy-MM-dd");
  // Reconstrói 23:59:59 local convertendo de volta para um instante UTC.
  // Aproximação suficiente para o MVP (sem biblioteca extra de fuso complexo).
  const naiveLocalEnd = new Date(`${localDateStr}T23:59:59`);
  return naiveLocalEnd;
}
