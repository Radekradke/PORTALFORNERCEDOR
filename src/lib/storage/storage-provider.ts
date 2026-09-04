export interface PutObjectInput {
  key: string;
  body: Buffer;
  contentType: string;
}

/**
 * Interface de infraestrutura para armazenamento privado de arquivos.
 * O domínio nunca importa o SDK do provedor diretamente (RNF-003).
 * Implementação local: MinIO (compatível com S3) via docker-compose.yml.
 * Usada a partir da fatia F3 (documentos/evidências); definida agora para
 * fixar o contrato e permitir troca de provedor sem tocar no domínio.
 */
export interface StorageProvider {
  putObject(input: PutObjectInput): Promise<void>;
  getSignedDownloadUrl(key: string, expiresInSeconds: number): Promise<string>;
  objectExists(key: string): Promise<boolean>;
}
