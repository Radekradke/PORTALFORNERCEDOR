import type { MailProvider, SendMailInput } from "./mail-provider";

/** Fallback que apenas registra que um e-mail seria enviado, sem expor conteúdo sensível. */
export class ConsoleMailProvider implements MailProvider {
  async send(input: SendMailInput): Promise<void> {
    // eslint-disable-next-line no-console
    console.log(`[mail:console] destinatário=${input.to} assunto="${input.subject}"`);
  }
}
