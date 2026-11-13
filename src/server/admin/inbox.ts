"use server";
import { z } from "zod";
import { db } from "@/lib/db";
import { guarded, idSchema, audit } from "./guard";

export async function setSubmissionStatus(input: unknown) {
  const schema = z.object({ ids: z.array(idSchema).min(1).max(200), status: z.enum(["NEW", "READ", "ARCHIVED", "SPAM"]) });
  return guarded("submission.write", schema, input, async ({ ids, status }, user) => {
    await db.contactSubmission.updateMany({ where: { id: { in: ids } }, data: { status } });
    await audit(user, "submission.status", "submission", ids[0], { count: ids.length, status });
  });
}

export async function deleteSubmissions(input: unknown) {
  return guarded("submission.write", z.object({ ids: z.array(idSchema).min(1).max(200) }), input, async ({ ids }, user) => {
    await db.contactSubmission.deleteMany({ where: { id: { in: ids } } });
    await audit(user, "submission.delete", "submission", ids[0], { count: ids.length });
  });
}
