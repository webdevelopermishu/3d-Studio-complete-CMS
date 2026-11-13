import { requirePermission, AuthError } from "@/lib/auth/session";
import { db } from "@/lib/db";

/** CSV export of submissions (respects the current status tab). Formula-injection safe. */
export async function GET(req: Request) {
  try {
    await requirePermission("submission.read");
  } catch (e) {
    return new Response(e instanceof AuthError ? e.message : "Forbidden", { status: 403 });
  }
  const status = new URL(req.url).searchParams.get("status") ?? "ALL";
  const where = status === "INBOX" ? { status: { in: ["NEW", "READ"] as ("NEW" | "READ")[] } } : ["NEW", "READ", "ARCHIVED", "SPAM"].includes(status) ? { status: status as "NEW" } : {};
  const rows = await db.contactSubmission.findMany({ where, orderBy: { createdAt: "desc" } });
  const cols = ["createdAt", "status", "name", "email", "company", "phone", "location", "disciplines", "services", "projectName", "description", "goals", "deliverables", "referenceUrl", "budget", "timeline", "stage", "filesUrl", "contactPref", "notes"] as const;
  const cell = (v: unknown) => {
    let s = Array.isArray(v) ? v.join("; ") : v instanceof Date ? v.toISOString() : String(v ?? "");
    if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; // neutralise spreadsheet formulas
    return `"${s.replace(/"/g, '""')}"`;
  };
  const csv = [cols.join(","), ...rows.map((r) => cols.map((c) => cell(r[c])).join(","))].join("\r\n");
  return new Response("﻿" + csv, {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="submissions-${new Date().toISOString().slice(0, 10)}.csv"`, "Cache-Control": "no-store" },
  });
}
