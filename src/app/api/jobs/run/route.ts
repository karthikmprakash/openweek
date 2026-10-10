import { getDb } from "@/lib/db";
import { runJobs } from "@/lib/jobs";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const secret = process.env.JOB_SECRET;
  if (!secret || request.headers.get("x-job-secret") !== secret) {
    return Response.json({ error: "Jobs are closed." }, { status: 403 });
  }
  const db = getDb();
  const studios = db.prepare(`SELECT id FROM studios`).all() as Array<{ id: string }>;
  const now = new Date();
  const results = studios.map((studio) => ({ studioId: studio.id, ...runJobs(db, studio.id, now) }));
  return Response.json({ ran: results.length, results });
}
