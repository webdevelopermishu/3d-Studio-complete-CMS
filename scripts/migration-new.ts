/**
 * Create a new SQL migration by diffing the last migrated schema snapshot against
 * prisma/schema.prisma. Works offline (no shadow database, no native engines).
 *
 *   npm run db:migration:new -- add_project_location
 */
import { execFileSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const name = (process.argv[2] || "").replace(/[^a-z0-9_]/gi, "_").toLowerCase();
if (!name) {
  console.error("Usage: npm run db:migration:new -- <name>");
  process.exit(1);
}
const root = process.cwd();
const schema = path.join(root, "prisma", "schema.prisma");
const snapshot = path.join(root, "prisma", "migrations", "schema.snapshot.prisma");

const args = ["prisma", "migrate", "diff", "--to-schema-datamodel", schema, "--script"];
if (existsSync(snapshot)) args.splice(3, 0, "--from-schema-datamodel", snapshot);
else args.splice(3, 0, "--from-empty");

const sql = execFileSync("npx", args, {
  encoding: "utf8",
  env: { ...process.env, PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING: "1" },
}).trim();

if (!sql || /^-- This is an empty migration\.?$/m.test(sql)) {
  console.log("No schema changes detected.");
  process.exit(0);
}
const stamp = new Date().toISOString().replace(/[-:T]/g, "").slice(0, 14);
const dir = path.join(root, "prisma", "migrations", `${stamp}_${name}`);
mkdirSync(dir, { recursive: true });
writeFileSync(path.join(dir, "migration.sql"), sql + "\n");
copyFileSync(schema, snapshot);
console.log(`✓ created ${path.relative(root, dir)}/migration.sql`);
