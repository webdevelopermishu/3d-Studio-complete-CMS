"use server";
import { db } from "@/lib/db";
import { requestMeta } from "@/lib/auth/session";
import { sendMail } from "@/lib/mailer";
import { briefSchema } from "@/lib/validation/contact";
import { logger } from "@/lib/logger";

export type BriefResult = { ok: true } | { ok: false; error: string; fieldErrors?: Record<string, string> };

const WINDOW_MIN = 10;
const MAX_PER_WINDOW = 5;

/** Public server action: validates, rate-limits by IP, stores, and notifies the studio. */
export async function submitBrief(input: unknown): Promise<BriefResult> {
  const parsed = briefSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const i of parsed.error.issues) fieldErrors[String(i.path[0])] ??= i.message;
    return { ok: false, error: "Please check the highlighted fields.", fieldErrors };
  }
  const d = parsed.data;
  const meta = await requestMeta();

  // Honeypot: pretend success, store nothing
  if (d.website) return { ok: true };

  const recent = await db.contactSubmission.count({
    where: { ip: meta.ip, createdAt: { gte: new Date(Date.now() - WINDOW_MIN * 60e3) } },
  });
  if (recent >= MAX_PER_WINDOW) return { ok: false, error: "Too many submissions from this connection. Please try again in a few minutes or email us." };

  const clean = (v?: string) => (v && v.trim() ? v.trim() : null);
  try {
    const row = await db.contactSubmission.create({
      data: {
        name: d.name, email: d.email.toLowerCase(), company: clean(d.company), phone: clean(d.phone), location: clean(d.location),
        disciplines: d.disciplines, services: d.services, projectName: clean(d.projectName), description: d.description,
        goals: clean(d.goals), deliverables: clean(d.deliverables), referenceUrl: clean(d.referenceUrl), budget: d.budget,
        timeline: d.timeline, stage: clean(d.stage), filesUrl: clean(d.filesUrl), contactPref: clean(d.contactPref),
        notes: clean(d.notes), ip: meta.ip, userAgent: meta.userAgent,
      },
    });
    const settings = await db.globalSettings.findUnique({ where: { id: "global" }, select: { email: true, siteName: true } });
    const to = process.env.CONTACT_NOTIFY_EMAIL || settings?.email;
    if (to) {
      await sendMail({
        to,
        replyTo: d.email,
        subject: `New brief: ${d.projectName || d.disciplines.join(", ")} — ${d.name}`,
        text: [
          `Name: ${d.name} <${d.email}>`, d.company && `Company: ${d.company}`, d.phone && `Phone: ${d.phone}`,
          `Disciplines: ${d.disciplines.join(", ")}`, `Services: ${d.services.join(", ")}`,
          `Budget: ${d.budget} · Timeline: ${d.timeline}`, "", d.description, "",
          `Open in admin: ${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/admin/submissions/${row.id}`,
        ].filter(Boolean).join("\n"),
      }).catch((e) => logger.error("contact.notify_failed", { error: String(e) }));
    }
    logger.info("contact.submitted", { id: row.id });
    return { ok: true };
  } catch (e) {
    logger.error("contact.store_failed", { error: String(e) });
    return { ok: false, error: "Something went wrong on our side. Please email us instead." };
  }
}
