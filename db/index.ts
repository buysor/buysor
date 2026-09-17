import { env } from "cloudflare:workers";
import type { D1Database } from "@cloudflare/workers-types";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";

export function getD1Binding(): D1Database {
  if (!env.DB) throw new Error("BUYSOR database is unavailable");
  return env.DB as D1Database;
}

export function getDb() {
  return drizzle(getD1Binding(), { schema });
}
