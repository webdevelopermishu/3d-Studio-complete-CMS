import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/** Liveness + DB check for uptime monitors and load balancers. */
export async function GET() {
  try {
    await db.$queryRaw`SELECT 1`;
    return Response.json({ ok: true, db: "up", time: new Date().toISOString() });
  } catch {
    return Response.json({ ok: false, db: "down" }, { status: 503 });
  }
}
