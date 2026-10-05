import { config } from "dotenv";
import { readFile } from "node:fs/promises";
import { connect } from "../src/lib/connection";
import { briefs, items, sources } from "../src/lib/schema";
config({ path: ".env.local" });
const filename = process.argv[2];
if (!filename)
  throw new Error("Usage: npm run db:restore -- backups/<file>.json");
const snapshot = JSON.parse(await readFile(filename, "utf8"));
if (
  snapshot.format !== "intelligence-v1" ||
  ![snapshot.briefs, snapshot.items, snapshot.sources].every(Array.isArray)
)
  throw new Error("Invalid backup format");
const { db, client } = connect();
try {
  await db.transaction(async (tx) => {
    for (const table of [briefs, items, sources]) {
      if ((await tx.select().from(table).limit(1)).length)
        throw new Error(
          "Restore requires an empty database. Set a new URL in .env.local and migrate first.",
        );
    }
    for (const row of snapshot.briefs) await tx.insert(briefs).values(row);
    for (const row of snapshot.items) await tx.insert(items).values(row);
    for (const row of snapshot.sources) await tx.insert(sources).values(row);
  });
  console.log("Backup restored");
} finally {
  client.close();
}
