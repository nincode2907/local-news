import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";
export function connect(
  url = process.env.TURSO_DATABASE_URL,
  token = process.env.TURSO_AUTH_TOKEN,
) {
  if (!url)
    throw new Error("TURSO_DATABASE_URL is missing. Configure .env.local.");
  const client = createClient({ url, authToken: token || undefined });
  return { client, db: drizzle(client, { schema }) };
}
