import { getBookingByToken } from "@/lib/booking";
import { getDb } from "@/lib/db";
import { getSession, getStudio } from "@/lib/schedule";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function stamp(iso: string) {
  return iso.replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function escape(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

export async function GET(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const db = getDb();
  const booking = getBookingByToken(db, token);
  const session = booking ? getSession(db, booking.session_id) : null;
  if (!booking || !session) return new Response("Not found", { status: 404 });
  const studio = getStudio(db, booking.studio_id);
  const manage = `${new URL(request.url).origin}/b/${token}`;
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Openweek//Booking//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${booking.id}@openweek`,
    `DTSTAMP:${stamp(new Date().toISOString())}`,
    `DTSTART:${stamp(session.starts_at)}`,
    `DTEND:${stamp(session.ends_at)}`,
    `SUMMARY:${escape(`${session.class_name} · ${studio.name}`)}`,
    `DESCRIPTION:${escape(`${session.instructor_name ? `With ${session.instructor_name}. ` : ""}Change or cancel: ${manage}`)}`,
    `URL:${manage}`,
    session.status === "cancelled" || booking.status === "cancelled" || booking.status === "late_cancelled" ? "STATUS:CANCELLED" : "STATUS:CONFIRMED",
    "BEGIN:VALARM",
    "TRIGGER:-PT1H",
    "ACTION:DISPLAY",
    `DESCRIPTION:${escape(session.class_name)}`,
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return new Response(lines.join("\r\n") + "\r\n", {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${session.class_name.replace(/[^a-z0-9]+/gi, "-").toLowerCase() || "class"}.ics"`,
      "Cache-Control": "no-store",
    },
  });
}
