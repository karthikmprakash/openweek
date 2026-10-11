import { getDb } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function check() {
  try {
    getDb().prepare("SELECT 1").get();
    return { ok: true as const, version: process.env.APP_VERSION ?? "0.1.0" };
  } catch {
    return { ok: false as const, version: process.env.APP_VERSION ?? "0.1.0" };
  }
}

export async function GET() {
  const body = check();
  return Response.json(body, { status: body.ok ? 200 : 503 });
}

export async function HEAD() {
  const body = check();
  return new Response(null, { status: body.ok ? 200 : 503 });
}
