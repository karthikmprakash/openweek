"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { checkIn } from "@/lib/attendance";
import {
  consumeRateLimit,
  createStudioAccount,
  deleteStudio,
  login,
} from "@/lib/auth";
import { bookGuest, bookWithCard, getBookingByToken } from "@/lib/booking";
import {
  createProduct,
  grantEntitlement,
  setEmailOptOut,
  upsertMember,
  type ProductKind,
} from "@/lib/credits";
import { getDb } from "@/lib/db";
import { isDomainError } from "@/lib/errors";
import { importMembers, type ImportField } from "@/lib/importer";
import { dollarsToCents } from "@/lib/money";
import { getStripeFromEnv } from "@/lib/payments";
import { cancelBooking } from "@/lib/policy";
import { emailExpiring } from "@/lib/reports";
import { addSession, createClassType, setStripeAccount, updatePolicies } from "@/lib/schedule";
import { zonedLocalToUtc } from "@/lib/time";
import { claimOffer, joinWaitlist } from "@/lib/waitlist";
import { clearSession, currentStaff, writeSession } from "@/server/session";

const email = z.string().trim().regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Add a real email.");

function fail(path: string, error: unknown): never {
  const message = isDomainError(error)
    ? error.message
    : error instanceof Error
      ? error.message
      : "Something went wrong.";
  redirect(`${path}?error=${encodeURIComponent(message)}`);
}

async function clientKey(label: string): Promise<string> {
  const head = await headers();
  const ip = head.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  return `${label}:${ip}`;
}

export async function signupAction(formData: FormData) {
  const parsed = z
    .object({
      studioName: z.string().trim().min(2).max(80),
      slug: z.string().trim().min(3).max(40),
      ownerName: z.string().trim().min(2).max(80),
      email,
      password: z.string().min(8).max(200),
      timezone: z.string().trim().min(1),
    })
    .safeParse({
      studioName: formData.get("studioName"),
      slug: formData.get("slug"),
      ownerName: formData.get("ownerName"),
      email: formData.get("email"),
      password: formData.get("password"),
      timezone: formData.get("timezone") || "America/Los_Angeles",
    });
  if (!parsed.success) fail("/signup", new Error(parsed.error.issues[0]?.message ?? "Check the form."));
  const db = getDb();
  const now = new Date();
  try {
    await consumeRateLimit(db, await clientKey("signup"), 8, 15 * 60 * 1000, now);
    const created = createStudioAccount(db, parsed.data, now);
    await writeSession(created.token);
  } catch (error) {
    fail("/signup", error);
  }
  redirect("/studio/schedule");
}

export async function loginAction(formData: FormData) {
  const parsed = z
    .object({ email, password: z.string().min(1) })
    .safeParse({ email: formData.get("email"), password: formData.get("password") });
  if (!parsed.success) fail("/login", new Error("Enter your email and password."));
  const db = getDb();
  const now = new Date();
  try {
    await consumeRateLimit(db, await clientKey(`login:${parsed.data.email}`), 8, 15 * 60 * 1000, now);
    const session = login(db, parsed.data.email, parsed.data.password, now);
    await writeSession(session.token);
  } catch (error) {
    fail("/login", error);
  }
  redirect("/studio");
}

export async function logoutAction() {
  await clearSession();
  redirect("/");
}

export async function publishClassAction(formData: FormData) {
  const staff = await currentStaff();
  if (!staff) redirect("/login");
  const db = getDb();
  const now = new Date();
  try {
    const price = dollarsToCents(String(formData.get("price") ?? ""));
    const classTypeId = createClassType(
      db,
      {
        studioId: staff.studioId,
        name: String(formData.get("name") ?? ""),
        durationMin: Number(formData.get("minutes") ?? 50),
        capacity: Number(formData.get("spots") ?? 8),
        dropInPriceCents: price,
        description: String(formData.get("description") ?? ""),
      },
      now,
    );
    const starts = zonedLocalToUtc(String(formData.get("startsAt") ?? ""), staff.timezone);
    addSession(
      db,
      {
        studioId: staff.studioId,
        classTypeId,
        startsAt: starts,
        instructorName: String(formData.get("instructor") ?? staff.name),
      },
      now,
    );
  } catch (error) {
    fail("/studio/schedule", error);
  }
  redirect("/studio/schedule");
}

export async function addSessionAction(formData: FormData) {
  const staff = await currentStaff();
  if (!staff) redirect("/login");
  const db = getDb();
  const now = new Date();
  try {
    addSession(
      db,
      {
        studioId: staff.studioId,
        classTypeId: String(formData.get("classTypeId") ?? ""),
        startsAt: zonedLocalToUtc(String(formData.get("startsAt") ?? ""), staff.timezone),
        instructorName: String(formData.get("instructor") ?? ""),
      },
      now,
    );
  } catch (error) {
    fail("/studio/schedule", error);
  }
  redirect("/studio/schedule");
}

export async function reserveAction(formData: FormData) {
  const studioId = String(formData.get("studioId") ?? "");
  const sessionId = String(formData.get("sessionId") ?? "");
  const slug = String(formData.get("slug") ?? "");
  const back = `/s/${slug}/book/${sessionId}`;
  const db = getDb();
  const now = new Date();
  let token = "";
  try {
    await consumeRateLimit(db, await clientKey("book"), 30, 10 * 60 * 1000, now);
    const booked = bookGuest(
      db,
      {
        studioId,
        sessionId,
        guestName: String(formData.get("guestName") ?? ""),
        guestEmail: String(formData.get("email") ?? ""),
      },
      now,
    );
    token = booked.booking.manage_token;
  } catch (error) {
    fail(back, error);
  }
  redirect(`/b/${token}`);
}

export async function payAndReserveAction(formData: FormData) {
  const studioId = String(formData.get("studioId") ?? "");
  const sessionId = String(formData.get("sessionId") ?? "");
  const slug = String(formData.get("slug") ?? "");
  const back = `/s/${slug}/book/${sessionId}`;
  const stripe = getStripeFromEnv();
  if (!stripe) fail(back, new Error("Connect Stripe in studio settings before taking a card."));
  const db = getDb();
  const now = new Date();
  let token = "";
  try {
    const studio = db.prepare(`SELECT stripe_account_id FROM studios WHERE id = ?`).get(studioId) as
      | { stripe_account_id: string | null }
      | undefined;
    const booked = await bookWithCard(
      db,
      stripe,
      {
        studioId,
        sessionId,
        guestName: String(formData.get("guestName") ?? ""),
        guestEmail: String(formData.get("email") ?? ""),
        idempotencyKey: String(formData.get("idempotencyKey") ?? crypto.randomUUID()),
        stripeAccountId: studio?.stripe_account_id ?? null,
      },
      now,
    );
    token = booked.booking.manage_token;
  } catch (error) {
    fail(back, error);
  }
  redirect(`/b/${token}`);
}

export async function waitlistAction(formData: FormData) {
  const sessionId = String(formData.get("sessionId") ?? "");
  const slug = String(formData.get("slug") ?? "");
  const back = `/s/${slug}/book/${sessionId}`;
  const db = getDb();
  let position = 0;
  try {
    const row = joinWaitlist(
      db,
      {
        studioId: String(formData.get("studioId") ?? ""),
        sessionId,
        guestName: String(formData.get("guestName") ?? ""),
        guestEmail: String(formData.get("email") ?? ""),
      },
      new Date(),
    );
    position = row.position;
  } catch (error) {
    fail(back, error);
  }
  redirect(`/s/${slug}?wait=${position}`);
}

export async function cancelBookingAction(formData: FormData) {
  const token = String(formData.get("token") ?? "");
  const db = getDb();
  try {
    cancelBooking(db, { token }, new Date());
  } catch (error) {
    fail(`/b/${token}`, error);
  }
  redirect(`/b/${token}`);
}

export async function claimOfferAction(formData: FormData) {
  const token = String(formData.get("token") ?? "");
  const db = getDb();
  try {
    claimOffer(db, token, new Date());
  } catch (error) {
    fail(`/b/${token}`, error);
  }
  redirect(`/b/${token}`);
}

export async function selfCheckInAction(formData: FormData) {
  const token = String(formData.get("token") ?? "");
  const db = getDb();
  const booking = getBookingByToken(db, token);
  if (!booking) fail("/", new Error("That confirmation link is not valid."));
  try {
    checkIn(db, { bookingId: booking.id, studioId: booking.studio_id, method: "self", token }, new Date());
  } catch (error) {
    fail(`/b/${token}`, error);
  }
  redirect(`/b/${token}`);
}

export async function staffCheckInAction(formData: FormData) {
  const staff = await currentStaff();
  if (!staff) redirect("/login");
  const db = getDb();
  try {
    checkIn(
      db,
      { bookingId: String(formData.get("bookingId") ?? ""), studioId: staff.studioId, method: "staff" },
      new Date(),
    );
  } catch (error) {
    fail("/studio/check-in", error);
  }
  redirect("/studio/check-in");
}

export async function savePoliciesAction(formData: FormData) {
  const staff = await currentStaff();
  if (!staff) redirect("/login");
  const db = getDb();
  const mode = (value: FormDataEntryValue | null) => {
    const raw = String(value ?? "forfeit");
    if (raw === "fee" || raw === "credit" || raw === "forfeit") return raw;
    return "forfeit" as const;
  };
  try {
    updatePolicies(
      db,
      staff.studioId,
      {
        cancellationWindowHours: Number(formData.get("windowHours") ?? 12),
        lateCancelMode: mode(formData.get("lateMode")),
        lateCancelFeeCents: dollarsToCents(String(formData.get("lateFee") ?? "0")),
        noShowMode: mode(formData.get("noShowMode")),
        noShowFeeCents: dollarsToCents(String(formData.get("noShowFee") ?? "0")),
        waitlistClaimMinutes: Number(formData.get("claimMinutes") ?? 60),
        reminderLeadHours: Number(formData.get("leadHours") ?? 24),
        timezone: String(formData.get("timezone") ?? staff.timezone),
      },
      new Date(),
    );
  } catch (error) {
    fail("/studio/policies", error);
  }
  redirect("/studio/policies?saved=1");
}

export async function saveStripeAction(formData: FormData) {
  const staff = await currentStaff();
  if (!staff) redirect("/login");
  const raw = String(formData.get("stripeAccount") ?? "").trim();
  try {
    setStripeAccount(getDb(), staff.studioId, raw || null, new Date());
  } catch (error) {
    fail("/studio/settings", error);
  }
  redirect("/studio/settings?saved=1");
}

export async function deleteStudioAction() {
  const staff = await currentStaff();
  if (!staff || staff.role !== "owner") redirect("/studio/settings?error=Only%20the%20owner%20can%20close%20the%20studio.");
  deleteStudio(getDb(), staff.studioId);
  await clearSession();
  redirect("/");
}

export async function createPassAction(formData: FormData) {
  const staff = await currentStaff();
  if (!staff) redirect("/login");
  const kind = String(formData.get("kind") ?? "") as ProductKind;
  if (kind !== "drop_in" && kind !== "pack" && kind !== "membership") {
    fail("/studio/offerings", new Error("Choose a drop-in, a pack, or a membership."));
  }
  try {
    createProduct(
      getDb(),
      {
        studioId: staff.studioId,
        kind,
        name: String(formData.get("name") ?? ""),
        priceCents: dollarsToCents(String(formData.get("price") ?? "0")),
        creditCount: kind === "pack" ? Number(formData.get("credits") ?? 0) : null,
        validityDays: Number(formData.get("days") ?? 30),
      },
      new Date(),
    );
  } catch (error) {
    fail("/studio/offerings", error);
  }
  redirect("/studio/offerings");
}

export async function grantPassAction(formData: FormData) {
  const staff = await currentStaff();
  if (!staff) redirect("/login");
  const db = getDb();
  const now = new Date();
  try {
    const memberId = upsertMember(
      db,
      staff.studioId,
      String(formData.get("guestName") ?? ""),
      String(formData.get("email") ?? ""),
      now,
    );
    grantEntitlement(db, { studioId: staff.studioId, memberId, productId: String(formData.get("productId") ?? "") }, now);
  } catch (error) {
    fail("/studio/offerings", error);
  }
  redirect("/studio/members");
}

export async function optOutAction(formData: FormData) {
  const token = String(formData.get("token") ?? "");
  const db = getDb();
  const booking = getBookingByToken(db, token);
  if (!booking) fail("/", new Error("That confirmation link is not valid."));
  setEmailOptOut(db, booking.studio_id, booking.guest_email, formData.get("optOut") === "1");
  redirect(`/b/${token}`);
}

export async function importAction(formData: FormData) {
  const staff = await currentStaff();
  if (!staff) redirect("/login");
  let text = String(formData.get("csv") ?? "");
  const file = formData.get("file");
  if (file instanceof File && file.size > 0) {
    if (file.size > 1_000_000) fail("/studio/import", new Error("Keep the file under 1 MB."));
    text = await file.text();
  }
  const mapping: Partial<Record<ImportField, string>> = {
    name: String(formData.get("map_name") ?? "name"),
    email: String(formData.get("map_email") ?? "email"),
    phone: String(formData.get("map_phone") ?? "phone"),
    product_kind: String(formData.get("map_product_kind") ?? "product_kind"),
    product_name: String(formData.get("map_product_name") ?? "product_name"),
    credits_remaining: String(formData.get("map_credits_remaining") ?? "credits_remaining"),
    expires_at: String(formData.get("map_expires_at") ?? "expires_at"),
  };
  let next = "/studio/import";
  try {
    const result = importMembers(getDb(), staff.studioId, text, mapping, { dryRun: formData.get("dryRun") === "1" }, new Date());
    const summary = result.dryRun
      ? `Preview only. ${result.preview.length} rows ready, ${result.badRows.length} rows need a fix.`
      : `Imported ${result.imported}. ${result.badRows.length} rows were reported and skipped.`;
    next = `/studio/import?notice=${encodeURIComponent(summary)}&bad=${encodeURIComponent(result.badRows.map((row) => `Line ${row.line}: ${row.reason}`).join("\n"))}`;
  } catch (error) {
    fail("/studio/import", error);
  }
  redirect(next);
}

export async function emailExpiringAction() {
  const staff = await currentStaff();
  if (!staff) redirect("/login");
  const result = emailExpiring(getDb(), staff.studioId, new Date());
  redirect(`/studio/reports?notice=${encodeURIComponent(`Queued ${result.queued}. Skipped ${result.skipped} who opted out.`)}`);
}
