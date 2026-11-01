import { getCloudflareContext } from "@opennextjs/cloudflare";
import type { Env } from "../types/env";
export async function environment(): Promise<Env> {
  return (await getCloudflareContext({ async: true })).env as unknown as Env;
}
export { Repository } from "./repository";
