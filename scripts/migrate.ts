/**
 * Prisma-compatible migration runner.
 *
 * Applies prisma/migrations/<name>/migration.sql files in order and records them in the
 * standard `_prisma_migrations` table (same columns + sha256 checksum as `prisma migrate deploy`),
 * so environments that do have Prisma's native engines can keep using `prisma migrate deploy`.
 *
 * Why: Prisma's native binaries may be unavailable (locked-down CI / egress rules) and the WASM
 * schema engine currently fails on PostgreSQL 16 catalogs. This runner needs only `pg`.
 *
 *   npm run db:migrate            apply pending migrations
 *   npm run db:migrate -- --status   list applied/pending
 */
import "dotenv/config";
import { createHash, randomUUID } from "node:crypto";
import { readdirSync, readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { Client } from "pg";

const DIR = path.join(process.cwd(), "prisma", "migrations");

async function main() {
  // Migrations hold a session-level advisory lock, which transaction-mode poolers (PgBouncer,
  // Supabase/Neon pooled hosts) do not support, so a direct connection can be given separately.
  const url = process.env.DIRECT_DATABASE_URL || process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  const client = new Client({ connectionString: url });
  await client.connect();
  try {
    await client.query(`CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
      "id" VARCHAR(36) PRIMARY KEY NOT NULL,
      "checksum" VARCHAR(64) NOT NULL,
      "finished_at" TIMESTAMPTZ,
      "migration_name" VARCHAR(255) NOT NULL,
      "logs" TEXT,
      "rolled_back_at" TIMESTAMPTZ,
      "started_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "applied_steps_count" INTEGER NOT NULL DEFAULT 0
    )`);
    // Serialize concurrent deploys
    await client.query("SELECT pg_advisory_lock(72707369)");

    const applied = new Map<string, string>(
      (
        await client.query<{ migration_name: string; checksum: string }>(
          `SELECT migration_name, checksum FROM "_prisma_migrations" WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL`,
        )
      ).rows.map((r) => [r.migration_name, r.checksum]),
    );

    const names = readdirSync(DIR, { withFileTypes: true })
      .filter((d) => d.isDirectory() && existsSync(path.join(DIR, d.name, "migration.sql")))
      .map((d) => d.name)
      .sort();

    if (process.argv.includes("--status")) {
      for (const n of names) console.log(`${applied.has(n) ? "applied" : "pending"}  ${n}`);
      return;
    }

    let count = 0;
    for (const name of names) {
      const sql = readFileSync(path.join(DIR, name, "migration.sql"), "utf8");
      const checksum = createHash("sha256").update(sql).digest("hex");
      if (applied.has(name)) {
        if (applied.get(name) !== checksum) {
          console.warn(`! ${name}: checksum differs from the applied version (file edited after apply)`);
        }
        continue;
      }
      const id = randomUUID();
      console.log(`→ applying ${name}`);
      await client.query(
        `INSERT INTO "_prisma_migrations" (id, checksum, migration_name, started_at) VALUES ($1,$2,$3,now())`,
        [id, checksum, name],
      );
      try {
        await client.query("BEGIN");
        await client.query(sql);
        await client.query("COMMIT");
      } catch (e) {
        await client.query("ROLLBACK");
        await client.query(`UPDATE "_prisma_migrations" SET logs=$2 WHERE id=$1`, [id, String(e)]);
        throw new Error(`Migration ${name} failed: ${(e as Error).message}`);
      }
      await client.query(
        `UPDATE "_prisma_migrations" SET finished_at=now(), applied_steps_count=1 WHERE id=$1`,
        [id],
      );
      count++;
    }
    console.log(count ? `✓ applied ${count} migration(s)` : "✓ database is up to date");
  } finally {
    await client.query("SELECT pg_advisory_unlock(72707369)").catch(() => {});
    await client.end();
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
