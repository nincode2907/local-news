import { config } from "dotenv";
config({ path: ".env.local" });
import { connect } from "../src/lib/connection";
import { importBrief } from "../src/lib/repository";
import { readFile } from "node:fs/promises";
const { db, client } = connect();
for (const file of ["2026-10-03.md", "2026-10-04.md", "2026-10-05.md"]) {
  console.log(
    await importBrief(db, await readFile("fixtures/" + file, "utf8")),
  );
}
client.close();
