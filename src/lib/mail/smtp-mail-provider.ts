import nodemailer, { type Transporter } from "nodemailer";
import { getEnv } from "@/lib/env";
import type { MailProvider, SendMailInput } from "./mail-provider";

export class SmtpMailProvider implements MailProvider {
  private transporter: Transporter;
  private from: string;

  constructor() {
    const env = getEnv();
    this.from = env.MAIL_FROM;
    this.transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_SECURE,
      auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASSWORD } : undefined,
    });
  }

  async send(input: SendMailInput): Promise<void> {
    // Nunca logar segredo, token ou conteúdo sensível (segurança mínima).
    await this.transporter.sendMail({
      from: this.from,
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
    });
  }
}
