import "server-only";
import { cache } from "react";
import { readSessionCookie } from "@/lib/session-cookie";
import { getActorFromToken } from "./session-service";
import type { Actor } from "../domain/actor";

/**
 * `cache()` evita repetir a consulta de sessão várias vezes na mesma
 * renderização (layout + página + componentes), mantendo a checagem
 * sempre no servidor.
 */
export const getCurrentActor = cache(async (): Promise<Actor | null> => {
  const token = readSessionCookie();
  if (!token) return null;
  return getActorFromToken(token);
});

export async function requireActor(): Promise<Actor> {
  const actor = await getCurrentActor();
  if (!actor) {
    throw new Error("Sessão não autenticada.");
  }
  return actor;
}
