"use server";
import { z } from "zod";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { hashPassword, passwordProblems, verifyPassword } from "@/lib/auth/password";
import {
  createSession, destroySession, getCurrentUser, isLoginThrottled, recordLoginAttempt, requestMeta, requirePermission,
} from "@/lib/auth/session";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { guarded, idSchema, audit, UserError, toError, type ActionResult } from "./guard";

// ───────────────────────── Auth ─────────────────────────
export async function login(_prev: unknown, form: FormData): Promise<ActionResult> {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  const next = String(form.get("next") ?? "/admin");
  if (!email || !password) return { ok: false, error: "Enter your email and password." };
  const { ip } = await requestMeta();
  const keys = [`ip:${ip}`, `email:${email}`];
  if (await isLoginThrottled(keys)) return { ok: false, error: "Too many attempts. Wait 15 minutes and try again." };

  const user = await db.user.findUnique({ where: { email } });
  // Always run a hash comparison to keep timing uniform
  const ok = user ? await verifyPassword(password, user.passwordHash) : await verifyPassword(password, "scrypt$32768$8$1$AAAAAAAAAAAAAAAAAAAAAA==$" + "A".repeat(86) + "==");
  if (!user || !ok || !user.active) {
    await recordLoginAttempt(keys, false);
    return { ok: false, error: "Email or password is incorrect." };
  }
  await recordLoginAttempt(keys, true);
  await createSession(user.id);
  await db.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  await audit({ id: user.id } as never, "auth.login", "user", user.id, { ip });
  redirect(next.startsWith("/admin") ? next : "/admin");
}

export async function logout() {
  const u = await getCurrentUser();
  await destroySession();
  if (u) await audit(u, "auth.logout", "user", u.id);
  redirect("/admin/login");
}

// ───────────────────────── Users ─────────────────────────
const userSchema = z.object({
  id: idSchema.optional(),
  name: z.string().trim().min(1, "Name is required.").max(120),
  email: z.email("Enter a valid email.").transform((e) => e.toLowerCase()),
  roleId: idSchema,
  active: z.boolean().default(true),
  password: z.string().max(200).optional(),
});

export async function saveUser(input: unknown) {
  return guarded("user.manage", userSchema, input, async ({ id, password, ...d }, me) => {
    if (password) {
      const prob = passwordProblems(password);
      if (prob) throw new UserError(prob, "password");
    }
    if (id === me.id && !d.active) throw new UserError("You can't deactivate your own account.", "active");
    if (id) {
      const admins = await db.role.findUnique({ where: { key: "ADMIN" } });
      if (id === me.id && admins && d.roleId !== admins.id) throw new UserError("You can't remove your own administrator role.", "roleId");
      await db.user.update({ where: { id }, data: { ...d, ...(password ? { passwordHash: await hashPassword(password) } : {}) } });
      if (password || !d.active) await db.session.deleteMany({ where: { userId: id, ...(id === me.id ? { id: { not: me.sessionId } } : {}) } });
    } else {
      if (!password) throw new UserError("Set an initial password.", "password");
      await db.user.create({ data: { ...d, passwordHash: await hashPassword(password) } });
    }
    await audit(me, id ? "user.update" : "user.create", "user", id, { email: d.email });
  });
}

export async function deleteUser(input: unknown) {
  return guarded("user.manage", z.object({ id: idSchema }), input, async ({ id }, me) => {
    if (id === me.id) throw new UserError("You can't delete your own account.");
    const target = await db.user.findUniqueOrThrow({ where: { id }, include: { role: true } });
    if (target.role.key === "ADMIN" && (await db.user.count({ where: { role: { key: "ADMIN" }, active: true } })) <= 1) {
      throw new UserError("Keep at least one active administrator.");
    }
    await db.user.delete({ where: { id } });
    await audit(me, "user.delete", "user", id, { email: target.email });
  });
}

export async function saveRolePermissions(input: unknown) {
  const keys = Object.keys(PERMISSIONS) as [string, ...string[]];
  const schema = z.object({ roleId: idSchema, permissions: z.array(z.enum(keys)).max(keys.length) });
  return guarded("user.manage", schema, input, async ({ roleId, permissions }, me) => {
    const role = await db.role.findUniqueOrThrow({ where: { id: roleId } });
    if (role.key === "ADMIN" && !permissions.includes("user.manage")) throw new UserError("Administrators must keep “Manage users and roles”.");
    const perms = await db.permission.findMany({ where: { key: { in: permissions } } });
    await db.$transaction([
      db.rolePermission.deleteMany({ where: { roleId } }),
      db.rolePermission.createMany({ data: perms.map((p) => ({ roleId, permissionId: p.id })) }),
    ]);
    await audit(me, "role.permissions", "role", roleId, { count: perms.length });
  });
}

// ───────────────────────── Profile ─────────────────────────
export async function updateProfile(input: unknown) {
  const schema = z.object({ name: z.string().trim().min(1).max(120), currentPassword: z.string().max(200).optional(), newPassword: z.string().max(200).optional() });
  try {
    const me = await getCurrentUser();
    if (!me) return { ok: false as const, error: "You are not signed in." };
    const parsed = schema.safeParse(input);
    if (!parsed.success) return { ok: false as const, error: "Check the form." };
    const { name, currentPassword, newPassword } = parsed.data;
    const data: { name: string; passwordHash?: string } = { name };
    if (newPassword) {
      const u = await db.user.findUniqueOrThrow({ where: { id: me.id } });
      if (!currentPassword || !(await verifyPassword(currentPassword, u.passwordHash))) return { ok: false as const, error: "Current password is incorrect.", fieldErrors: { currentPassword: "Incorrect password." } };
      const prob = passwordProblems(newPassword);
      if (prob) return { ok: false as const, error: prob, fieldErrors: { newPassword: prob } };
      data.passwordHash = await hashPassword(newPassword);
    }
    await db.user.update({ where: { id: me.id }, data });
    if (newPassword) await db.session.deleteMany({ where: { userId: me.id, id: { not: me.sessionId } } });
    await audit(me, "profile.update", "user", me.id, { passwordChanged: !!newPassword });
    return { ok: true as const };
  } catch (e) {
    return toError(e);
  }
}

export async function revokeOtherSessions() {
  const me = await requirePermission();
  await db.session.deleteMany({ where: { userId: me.id, id: { not: me.sessionId } } });
  return { ok: true as const };
}
