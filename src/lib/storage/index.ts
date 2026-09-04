import { S3StorageProvider } from "./s3-storage-provider";
import type { StorageProvider } from "./storage-provider";

let cached: StorageProvider | undefined;

export function getStorageProvider(): StorageProvider {
  if (!cached) cached = new S3StorageProvider();
  return cached;
}

export type { StorageProvider, PutObjectInput } from "./storage-provider";
