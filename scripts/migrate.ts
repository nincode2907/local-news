import { config } from "dotenv";
config({ path: ".env.local" });
import { connect } from "../src/lib/connection";
import { migrate } from "drizzle-orm/libsql/migrator";
const { db, client } = connect();
await migrate(db, { migrationsFolder: "./drizzle" });
client.close();
console.log("Migration complete");
