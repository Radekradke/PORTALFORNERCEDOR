export interface SendMailInput {
  to: string;
  subject: string;
  html: string;
  text: string;
}

/**
 * Interface de infraestrutura para envio de e-mail. O domínio nunca importa
 * um SDK de provedor diretamente (arquitetar-stack-free). Implementações:
 * - SmtpMailProvider: usa Mailpit em desenvolvimento e SMTP configurável em
 *   produção (mesma implementação, apenas variáveis de ambiente mudam).
 * - ConsoleMailProvider: fallback para ambientes sem SMTP (ex.: alguns testes).
 */
export interface MailProvider {
  send(input: SendMailInput): Promise<void>;
}
