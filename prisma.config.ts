import "dotenv/config";
import path from "node:path";
import { defineConfig } from "prisma/config";
import { PrismaPg } from "@prisma/adapter-pg";

/**
 * Prisma runs fully on its JavaScript/WASM engines here (no native binaries):
 * - the schema engine (migrations) uses the pg driver adapter
 * - the client uses the TypeScript query compiler (engineType = "client")
 * This keeps installs working in locked-down CI and serverless environments.
 */
export default defineConfig({
  experimental: { adapter: true },
  schema: path.join("prisma", "schema.prisma"),
  engine: "js",
  adapter: async () => new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
  migrations: { path: path.join("prisma", "migrations"), seed: "tsx prisma/seed.ts" },
});
