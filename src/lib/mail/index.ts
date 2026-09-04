import { getEnv } from "@/lib/env";
import type { MailProvider } from "./mail-provider";
import { SmtpMailProvider } from "./smtp-mail-provider";
import { ConsoleMailProvider } from "./console-mail-provider";

let cached: MailProvider | undefined;

export function getMailProvider(): MailProvider {
  if (cached) return cached;
  const env = getEnv();
  cached = env.MAIL_PROVIDER === "console" ? new ConsoleMailProvider() : new SmtpMailProvider();
  return cached;
}

export type { MailProvider, SendMailInput } from "./mail-provider";
