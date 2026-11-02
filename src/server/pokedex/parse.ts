import type { z } from "zod";
import { PokeApiError, type PokeApiClient } from "../pokeapi/client";

/** Fetch + validate. `null` means the resource does not exist. */
export async function parseResource<S extends z.ZodType>(
  client: PokeApiClient,
  path: string,
  schema: S,
): Promise<z.infer<S> | null> {
  const raw = await client.get(path);
  if (raw === null) return null;
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    throw new PokeApiError(`Unexpected response shape for ${path}: ${parsed.error.message}`);
  }
  return parsed.data;
}
