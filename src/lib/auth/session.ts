import "server-only";
import { cache } from "react";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { createHash, randomBytes } from "node:crypto";
import { db } from "@/lib/db";
import type { PermissionKey } from "./permissions";

export const SESSION_COOKIE = "studio_session";
const SESSION_DAYS = 30;
const RENEW_WHEN_DAYS_LEFT = 15;

const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

export type CurrentUser = {
  id: string;
  email: string;
  name: string;
  roleKey: string;
  roleName: string;
  permissions: Set<PermissionKey>;
  sessionId: string;
};

export async function requestMeta() {
  const h = await headers();
  const ip = (h.get("x-forwarded-for") || "").split(",")[0].trim() || h.get("x-real-ip") || "local";
  return { ip, userAgent: h.get("user-agent")?.slice(0, 300) ?? null };
}

export async function createSession(userId: string) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 864e5);
  const meta = await requestMeta();
  await db.session.create({
    data: { userId, tokenHash: sha256(token), expiresAt, ip: meta.ip, userAgent: meta.userAgent },
  });
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production" && !process.env.INSECURE_COOKIES,
    path: "/",
    expires: expiresAt,
  });
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await db.session.deleteMany({ where: { tokenHash: sha256(token) } });
  jar.delete(SESSION_COOKIE);
}

/** Resolve the signed-in user for this request (memoised per request). */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = await db.session.findUnique({
    where: { tokenHash: sha256(token) },
    include: { user: { include: { role: { include: { permissions: { include: { permission: true } } } } } } },
  });
  if (!session || session.expiresAt < new Date() || !session.user.active) return null;

  // Sliding expiry (DB side; cookie keeps its original max-age, renewed on next login)
  if (session.expiresAt.getTime() - Date.now() < RENEW_WHEN_DAYS_LEFT * 864e5) {
    await db.session.update({
      where: { id: session.id },
      data: { expiresAt: new Date(Date.now() + SESSION_DAYS * 864e5) },
    });
  }
  const u = session.user;
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    roleKey: u.role.key,
    roleName: u.role.name,
    permissions: new Set(u.role.permissions.map((rp) => rp.permission.key as PermissionKey)),
    sessionId: session.id,
  };
});

export class AuthError extends Error {
  constructor(
    message: string,
    public status: 401 | 403 = 401,
  ) {
    super(message);
  }
}

/** For server actions / route handlers: throws when not allowed. */
export async function requirePermission(...perms: PermissionKey[]): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) throw new AuthError("You are not signed in.", 401);
  for (const p of perms) if (!user.permissions.has(p)) throw new AuthError(`Missing permission: ${p}`, 403);
  return user;
}

/** For admin pages: redirects to login / shows forbidden. */
export async function requirePageUser(perm?: PermissionKey): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/admin/login");
  if (perm && !user.permissions.has(perm)) redirect("/admin?forbidden=" + encodeURIComponent(perm));
  return user;
}

export function can(user: CurrentUser | null, perm: PermissionKey) {
  return !!user && user.permissions.has(perm);
}

// ── Login throttling ──────────────────────────────────────────
const WINDOW_MIN = 15;
const MAX_FAILS = 8;

export async function isLoginThrottled(keys: string[]) {
  const since = new Date(Date.now() - WINDOW_MIN * 60e3);
  const fails = await db.loginAttempt.count({
    where: { key: { in: keys }, success: false, createdAt: { gte: since } },
  });
  return fails >= MAX_FAILS;
}

export async function recordLoginAttempt(keys: string[], success: boolean) {
  await db.loginAttempt.createMany({ data: keys.map((key) => ({ key, success })) });
  if (success) {
    await db.loginAttempt.deleteMany({ where: { key: { in: keys }, success: false } });
  }
}
