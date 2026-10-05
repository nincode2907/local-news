import { config } from "dotenv";
config({ path: ".env.local" });
import { connect } from "../src/lib/connection";
import { briefs, items, sources } from "../src/lib/schema";
import { mkdir, writeFile } from "node:fs/promises";
const { db, client } = connect();
const backup = await db.transaction(
  async (tx) => ({
    format: "intelligence-v1",
    createdAt: new Date().toISOString(),
    briefs: await tx.select().from(briefs),
    items: await tx.select().from(items),
    sources: await tx.select().from(sources),
  }),
  { behavior: "deferred" },
);
await mkdir("backups", { recursive: true });
const file = "backups/intelligence-" + Date.now() + ".json";
await writeFile(file, JSON.stringify(backup, null, 2));
client.close();
console.log(file);
