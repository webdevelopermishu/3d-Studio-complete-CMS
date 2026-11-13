/**
 * Drops and recreates the public schema of DATABASE_URL. Refuses to run against production.
 *   npm run db:reset   (reset → migrate → seed)
 */
import "dotenv/config";
import { Client } from "pg";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  if (process.env.NODE_ENV === "production" && !process.argv.includes("--force")) {
    throw new Error("Refusing to reset a database with NODE_ENV=production (pass --force if you really mean it).");
  }
  const c = new Client({ connectionString: url });
  await c.connect();
  await c.query("DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;");
  await c.end();
  console.log(`✓ reset ${new URL(url).pathname.slice(1)}`);
}
main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
