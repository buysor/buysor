import { env } from "cloudflare:workers";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";

export function getD1Binding() {
  if (!env.DB) {
    throw new Error("BUYSOR database is unavailable");
  }

  return env.DB;
}

export function getDb() {
  return drizzle(getD1Binding(), { schema });
}
