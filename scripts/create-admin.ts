/**
 * Create an admin (or any role) account, or reset an existing account's password.
 *
 *   npm run admin:create -- --email you@studio.com --name "Your Name"
 *   npm run admin:create -- --email editor@studio.com --role EDITOR
 *   npm run admin:create -- --email you@studio.com --reset        (new password, signs out all sessions)
 *
 * The password is read from --password, then ADMIN_PASSWORD, then an interactive prompt (input
 * hidden). Roles must exist already: run `npm run db:migrate && npm run db:seed -- --no-demo`
 * on a fresh database first.
 */
import "dotenv/config";
import { createInterface } from "node:readline";
import { Writable } from "node:stream";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { hashPassword, passwordProblems } from "../src/lib/auth/password";

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  if (i === -1) return undefined;
  const v = process.argv[i + 1];
  return v && !v.startsWith("--") ? v : "";
}
const flag = (name: string) => process.argv.includes(`--${name}`);

async function prompt(question: string, hidden = false): Promise<string> {
  let muted = false;
  const output = new Writable({
    write(chunk, _enc, cb) {
      if (!muted) process.stdout.write(chunk);
      cb();
    },
  });
  const rl = createInterface({ input: process.stdin, output, terminal: true });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      if (hidden) process.stdout.write("\n");
      resolve(answer.trim());
    });
    muted = hidden;
  });
}

async function main() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not set");
  const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
  try {
    const email = (arg("email") || process.env.ADMIN_EMAIL || (await prompt("Email: "))).toLowerCase().trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error(`"${email}" is not a valid email address`);

    const roleKey = (arg("role") || "ADMIN").toUpperCase();
    const role = await db.role.findUnique({ where: { key: roleKey } });
    if (!role) {
      const keys = (await db.role.findMany({ select: { key: true } })).map((r) => r.key);
      throw new Error(
        keys.length
          ? `Role ${roleKey} does not exist. Available roles: ${keys.join(", ")}`
          : "No roles found. Run `npm run db:seed -- --no-demo` first.",
      );
    }

    const existing = await db.user.findUnique({ where: { email } });
    const reset = flag("reset");
    if (existing && !reset) {
      throw new Error(`${email} already exists. Pass --reset to set a new password for it.`);
    }
    if (!existing && reset) throw new Error(`${email} does not exist, so there is nothing to reset.`);

    let password = arg("password") || process.env.ADMIN_PASSWORD || "";
    if (!password) {
      password = await prompt("Password (min 10 characters): ", true);
      const again = await prompt("Repeat password: ", true);
      if (password !== again) throw new Error("Passwords do not match");
    }
    const problem = passwordProblems(password);
    if (problem) throw new Error(problem);
    const passwordHash = await hashPassword(password);

    if (existing) {
      await db.$transaction([
        db.user.update({ where: { id: existing.id }, data: { passwordHash, active: true } }),
        db.session.deleteMany({ where: { userId: existing.id } }),
      ]);
      console.log(`✓ password reset for ${email}; existing sessions were signed out`);
    } else {
      const name = arg("name") || process.env.ADMIN_NAME || "Administrator";
      await db.user.create({ data: { email, name, passwordHash, roleId: role.id } });
      console.log(`✓ created ${role.name} account ${email}`);
    }
  } finally {
    await db.$disconnect();
  }
}

main().catch((e: unknown) => {
  console.error(`✗ ${e instanceof Error ? e.message : String(e)}`);
  process.exit(1);
});
