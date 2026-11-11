import pg from "pg";
import { readFileSync } from "node:fs";
const url = process.env.DATABASE_URL;
if (!url) { console.error("DATABASE_URL is not set"); process.exit(1); }
const c = new pg.Client({ connectionString: url });
await c.connect();
await c.query(readFileSync(new URL("../db/schema.sql", import.meta.url), "utf8"));
await c.end();
console.log("schema applied");
