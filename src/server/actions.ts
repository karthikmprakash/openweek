"use server";

import { refresh } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { checkIn } from "@/lib/attendance";
import { consumeRateLimit, createStudioAccount, deleteStudio, login } from "@/lib/auth";
import { bookGuest, bookWithCard, getActiveBookingForEmail, getBookingByToken, listUpcomingBookingsForEmail } from "@/lib/booking";
import { createProduct, grantEntitlement, setEmailOptOut, upsertMember, type ProductKind } from "@/lib/credits";
import { getDb } from "@/lib/db";
import { DomainError } from "@/lib/errors";
import { failure, type FormState } from "@/lib/form-state";
import { importMembers, type ImportField, type ImportResult } from "@/lib/importer";
import { dollarsToCents } from "@/lib/money";
import { getStripeFromEnv } from "@/lib/payments";
import { cancelBooking } from "@/lib/policy";
import { emailExpiring } from "@/lib/reports";
import { addWeeklySessions, createClassType, getStudioBySlug, setStripeAccount, updatePolicies } from "@/lib/schedule";
import { cancelSession } from "@/lib/sessions";
import { claimOffer, joinWaitlist, listActiveWaitlistForEmail } from "@/lib/waitlist";
import { clearGuestEmail, writeGuestEmail } from "@/server/guest";
import { clearSession, currentStaff, writeSession } from "@/server/session";

const email = z.string().trim().regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Add a real email address.");

async function clientKey(label: string): Promise<string> {
  const head = await headers();
  const ip = head.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  return `${label}:${ip}`;
}

async function requireStaff() {
  const staff = await currentStaff();
  if (!staff) redirect("/login");
  return staff;
}

function text(formData: FormData, key: string, fallback = ""): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : fallback;
}

function whole(formData: FormData, key: string, label: string): number {
  const raw = text(formData, key).trim();
  if (!/^\d+$/.test(raw)) throw new DomainError(`${label} needs a whole number.`, key);
  return Number(raw);
}

function bookingPath(token: string) {
  return `/b/${encodeURIComponent(token)}`;
}

export async function signupAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = z
    .object({
      studioName: z.string().trim().min(2, "Add the studio name.").max(80, "Keep the studio name under 80 characters."),
      slug: z.string().trim().min(3, "The web address needs at least 3 characters.").max(40, "Keep the web address under 40 characters."),
      ownerName: z.string().trim().min(2, "Add your name.").max(80, "Keep your name under 80 characters."),
      email,
      password: z.string().min(8, "Use at least 8 characters for the password.").max(200),
      timezone: z.string().trim().min(1, "Pick a time zone."),
    })
    .safeParse({
      studioName: text(formData, "studioName"),
      slug: text(formData, "slug"),
      ownerName: text(formData, "ownerName"),
      email: text(formData, "email"),
      password: text(formData, "password"),
      timezone: text(formData, "timezone") || "America/Los_Angeles",
    });
  if (!parsed.success) return failure(new Error(parsed.error.issues[0]?.message ?? "Check the form."), formData);
  const db = getDb();
  const now = new Date();
  try {
    await consumeRateLimit(db, await clientKey("signup"), 8, 15 * 60 * 1000, now);
    const created = createStudioAccount(db, parsed.data, now);
    await writeSession(created.token);
  } catch (error) {
    return failure(error, formData);
  }
  redirect("/studio");
}

export async function loginAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = z
    .object({ email, password: z.string().min(1) })
    .safeParse({ email: text(formData, "email"), password: text(formData, "password") });
  if (!parsed.success) return failure(new Error("Enter your email and password."), formData);
  const db = getDb();
  const now = new Date();
  try {
    await consumeRateLimit(db, await clientKey(`login:${parsed.data.email}`), 8, 15 * 60 * 1000, now);
    const session = login(db, parsed.data.email, parsed.data.password, now);
    await writeSession(session.token);
  } catch (error) {
    return failure(error, formData);
  }
  redirect("/studio");
}

export async function logoutAction() {
  await clearSession();
  redirect("/");
}

export async function publishClassAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const staff = await requireStaff();
  const db = getDb();
  const now = new Date();
  const name = text(formData, "name").trim();
  let created = 0;
  try {
    const price = dollarsToCents(text(formData, "price"));
    const minutes = whole(formData, "minutes", "Class length");
    const spots = whole(formData, "spots", "Spots");
    const weeks = whole(formData, "repeatWeeks", "Weeks");
    db.transaction(() => {
      const classTypeId = createClassType(
        db,
        { studioId: staff.studioId, name, durationMin: minutes, capacity: spots, dropInPriceCents: price, description: text(formData, "description") },
        now,
      );
      created = addWeeklySessions(
        db,
        {
          studioId: staff.studioId,
          classTypeId,
          firstLocal: text(formData, "startsAt"),
          timeZone: staff.timezone,
          weeks,
          instructorName: text(formData, "instructor", staff.name),
        },
        now,
      ).length;
    })();
  } catch (error) {
    return failure(error, formData);
  }
  const week = text(formData, "startsAt").slice(0, 10);
  const notice = created === 1 ? `Published ${name}.` : `Published ${name} for ${created} weeks.`;
  redirect(`/studio/schedule?week=${week}&notice=${encodeURIComponent(notice)}`);
}

export async function addSessionAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const staff = await requireStaff();
  const db = getDb();
  let created = 0;
  try {
    created = addWeeklySessions(
      db,
      {
        studioId: staff.studioId,
        classTypeId: text(formData, "classTypeId"),
        firstLocal: text(formData, "startsAt"),
        timeZone: staff.timezone,
        weeks: whole(formData, "repeatWeeks", "Weeks"),
        instructorName: text(formData, "instructor"),
      },
      new Date(),
    ).length;
  } catch (error) {
    return failure(error, formData);
  }
  const week = text(formData, "startsAt").slice(0, 10);
  const notice = created === 1 ? "Session added." : `Added ${created} weekly sessions.`;
  redirect(`/studio/schedule?week=${week}&notice=${encodeURIComponent(notice)}`);
}

export async function cancelSessionAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const staff = await requireStaff();
  const sessionId = text(formData, "sessionId");
  let summary = "";
  try {
    const result = cancelSession(getDb(), staff.studioId, sessionId, new Date());
    const parts = [`Class cancelled. ${result.cancelled} ${result.cancelled === 1 ? "member was" : "members were"} told.`];
    if (result.restored > 0) parts.push(`${result.restored} visit${result.restored === 1 ? "" : "s"} returned to passes.`);
    if (result.paidByCard > 0) parts.push(`Refund ${result.paidByCard} card payment${result.paidByCard === 1 ? "" : "s"} in Stripe.`);
    summary = parts.join(" ");
  } catch (error) {
    return failure(error, formData);
  }
  redirect(`/studio/schedule?notice=${encodeURIComponent(summary)}`);
}

export async function bookAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const studioId = text(formData, "studioId");
  const sessionId = text(formData, "sessionId");
  const guestName = text(formData, "guestName");
  const guestEmail = text(formData, "email");
  const db = getDb();
  const now = new Date();
  let token = "";
  const card = text(formData, "intent") === "card";
  const already = getActiveBookingForEmail(db, sessionId, guestEmail);
  if (already) {
    await writeGuestEmail(already.guest_email);
    redirect(bookingPath(already.manage_token));
  }
  try {
    await consumeRateLimit(db, await clientKey("book"), 30, 10 * 60 * 1000, now);
    if (card) {
      const stripe = getStripeFromEnv();
      if (!stripe) throw new DomainError("This studio isn't taking card payments yet. Use a pass, or ask the studio.", "stripe");
      const studio = db.prepare(`SELECT stripe_account_id FROM studios WHERE id = ?`).get(studioId) as
        | { stripe_account_id: string | null }
        | undefined;
      const booked = await bookWithCard(
        db,
        stripe,
        {
          studioId,
          sessionId,
          guestName,
          guestEmail,
          idempotencyKey: text(formData, "idempotencyKey") || crypto.randomUUID(),
          stripeAccountId: studio?.stripe_account_id ?? null,
        },
        now,
      );
      token = booked.booking.manage_token;
    } else {
      token = bookGuest(db, { studioId, sessionId, guestName, guestEmail }, now).booking.manage_token;
    }
  } catch (error) {
    if (error instanceof DomainError && error.code === "duplicate") {
      const existing = getActiveBookingForEmail(db, sessionId, guestEmail);
      if (existing) {
        await writeGuestEmail(existing.guest_email);
        redirect(bookingPath(existing.manage_token));
      }
    }
    if (card) refresh();
    return failure(error, formData);
  }
  await writeGuestEmail(guestEmail);
  redirect(bookingPath(token));
}

export async function waitlistAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const slug = text(formData, "slug");
  let position = 0;
  try {
    const row = joinWaitlist(
      getDb(),
      {
        studioId: text(formData, "studioId"),
        sessionId: text(formData, "sessionId"),
        guestName: text(formData, "guestName"),
        guestEmail: text(formData, "email"),
      },
      new Date(),
    );
    position = row.position;
    await writeGuestEmail(text(formData, "email"));
  } catch (error) {
    return failure(error, formData);
  }
  redirect(`/s/${encodeURIComponent(slug)}?wait=${position}`);
}

export async function findBookingAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const slug = text(formData, "slug");
  const parsed = email.safeParse(text(formData, "email"));
  if (!parsed.success) return failure(new Error("Add the email you booked with."), formData);
  const db = getDb();
  const now = new Date();
  try {
    await consumeRateLimit(db, await clientKey(`find:${parsed.data}`), 8, 15 * 60 * 1000, now);
    const studio = getStudioBySlug(db, slug);
    if (!studio) throw new DomainError("That studio is not on Openweek.", "not_found");
    const upcoming = listUpcomingBookingsForEmail(db, studio.id, parsed.data, now);
    const waiting = listActiveWaitlistForEmail(db, studio.id, parsed.data);
    if (upcoming.length === 0 && waiting.length === 0) {
      throw new DomainError("No upcoming classes or waitlist spots for that email. Check the address, or reserve from the week above.", "not_found");
    }
    await writeGuestEmail(parsed.data);
  } catch (error) {
    return failure(error, formData);
  }
  redirect(`/s/${encodeURIComponent(slug)}`);
}

export async function forgetGuestAction() {
  await clearGuestEmail();
  refresh();
}

export async function rememberGuestFromToken(token: string) {
  if (await currentStaff()) return;
  const booking = getBookingByToken(getDb(), token);
  if (!booking) return;
  if (!["confirmed", "offer_pending", "attended"].includes(booking.status)) return;
  await writeGuestEmail(booking.guest_email);
}

export async function cancelBookingAction(_prev: FormState, formData: FormData): Promise<FormState> {
  try {
    cancelBooking(getDb(), { token: text(formData, "token") }, new Date());
  } catch (error) {
    return failure(error);
  }
  refresh();
  return null;
}

export async function claimOfferAction(_prev: FormState, formData: FormData): Promise<FormState> {
  try {
    const booking = claimOffer(getDb(), text(formData, "token"), new Date());
    await writeGuestEmail(booking.guest_email);
  } catch (error) {
    return failure(error);
  }
  refresh();
  return null;
}

export async function selfCheckInAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const token = text(formData, "token");
  const db = getDb();
  try {
    const booking = getBookingByToken(db, token);
    if (!booking) throw new DomainError("That confirmation link is not valid.", "not_found");
    checkIn(db, { bookingId: booking.id, studioId: booking.studio_id, method: "self", token }, new Date());
  } catch (error) {
    return failure(error);
  }
  refresh();
  return null;
}

export async function optOutAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const db = getDb();
  const optOut = text(formData, "optOut") === "1";
  try {
    const booking = getBookingByToken(db, text(formData, "token"));
    if (!booking) throw new DomainError("That confirmation link is not valid.", "not_found");
    setEmailOptOut(db, booking.studio_id, booking.guest_email, optOut);
  } catch (error) {
    return failure(error);
  }
  refresh();
  return { notice: optOut ? "Reminder emails are off." : "Reminder emails are back on." };
}

export async function staffCheckInAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const staff = await requireStaff();
  try {
    checkIn(getDb(), { bookingId: text(formData, "bookingId"), studioId: staff.studioId, method: "staff" }, new Date());
  } catch (error) {
    return failure(error);
  }
  refresh();
  return null;
}

export async function savePoliciesAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const staff = await requireStaff();
  const mode = (value: string) => (value === "fee" || value === "credit" ? value : "forfeit");
  try {
    updatePolicies(
      getDb(),
      staff.studioId,
      {
        cancellationWindowHours: whole(formData, "windowHours", "The cancellation window"),
        lateCancelMode: mode(text(formData, "lateMode")),
        lateCancelFeeCents: dollarsToCents(text(formData, "lateFee", "0")),
        noShowMode: mode(text(formData, "noShowMode")),
        noShowFeeCents: dollarsToCents(text(formData, "noShowFee", "0")),
        waitlistClaimMinutes: whole(formData, "claimMinutes", "The claim window"),
        reminderLeadHours: whole(formData, "leadHours", "Reminder timing"),
        timezone: text(formData, "timezone", staff.timezone),
      },
      new Date(),
    );
  } catch (error) {
    return failure(error, formData);
  }
  redirect("/studio/policies?saved=1");
}

export async function saveStripeAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const staff = await requireStaff();
  const raw = text(formData, "stripeAccount").trim();
  try {
    setStripeAccount(getDb(), staff.studioId, raw || null, new Date());
  } catch (error) {
    return failure(error, formData);
  }
  redirect("/studio/settings?saved=1");
}

export async function deleteStudioAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const staff = await requireStaff();
  if (staff.role !== "owner") return { error: "Only the owner can close the studio." };
  if (text(formData, "confirm").trim().toLowerCase() !== staff.slug) {
    return { error: `Type ${staff.slug} to confirm.` };
  }
  deleteStudio(getDb(), staff.studioId);
  await clearSession();
  redirect("/");
}

export async function createPassAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const staff = await requireStaff();
  const kind = text(formData, "kind") as ProductKind;
  const name = text(formData, "name").trim();
  try {
    if (kind !== "drop_in" && kind !== "pack" && kind !== "membership") {
      throw new DomainError("Choose a drop-in, a pack, or a membership.", "kind");
    }
    createProduct(
      getDb(),
      {
        studioId: staff.studioId,
        kind,
        name,
        priceCents: dollarsToCents(text(formData, "price", "0")),
        creditCount: kind === "pack" ? whole(formData, "credits", "Visits in a pack") : null,
        validityDays: whole(formData, "days", "Valid for"),
      },
      new Date(),
    );
  } catch (error) {
    return failure(error, formData);
  }
  refresh();
  return { notice: `${name} is ready to give to members.` };
}

export async function grantPassAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const staff = await requireStaff();
  const db = getDb();
  const now = new Date();
  let memberId = "";
  try {
    const address = email.safeParse(text(formData, "email"));
    if (!address.success) throw new DomainError("Add a real email address.", "email");
    const guestName = text(formData, "guestName").trim();
    if (guestName.length < 2) throw new DomainError("Add the member's name.", "name");
    db.transaction(() => {
      memberId = upsertMember(db, staff.studioId, guestName, address.data, now);
      grantEntitlement(db, { studioId: staff.studioId, memberId, productId: text(formData, "productId") }, now);
    })();
  } catch (error) {
    return failure(error, formData);
  }
  redirect(`/studio/members/${memberId}?notice=${encodeURIComponent("Pass given.")}`);
}

export type ImportState = (FormState & { result?: ImportResult }) | null;

export async function importAction(_prev: ImportState, formData: FormData): Promise<ImportState> {
  const staff = await requireStaff();
  const csv = text(formData, "csv");
  if (csv.length > 1_000_000) return { error: "Keep the file under 1 MB." };
  if (!csv.trim()) return { error: "Choose a CSV file or paste rows first." };
  const mapping = {} as Partial<Record<ImportField, string>>;
  for (const field of ["name", "email", "phone", "product_kind", "product_name", "credits_remaining", "expires_at"] as const) {
    mapping[field] = text(formData, `map_${field}`, field);
  }
  const dryRun = text(formData, "intent") !== "import";
  try {
    const result = importMembers(getDb(), staff.studioId, csv, mapping, { dryRun }, new Date());
    if (!dryRun) refresh();
    return {
      result,
      notice: dryRun
        ? `Preview: ${result.preview.length} row${result.preview.length === 1 ? "" : "s"} ready, ${result.badRows.length} need a fix. Nothing was saved.`
        : `Imported ${result.imported} member pass${result.imported === 1 ? "" : "es"}. ${result.badRows.length} row${result.badRows.length === 1 ? " was" : "s were"} skipped.`,
    };
  } catch (error) {
    return failure(error);
  }
}

export async function emailExpiringAction(): Promise<FormState> {
  const staff = await requireStaff();
  const result = emailExpiring(getDb(), staff.studioId, new Date());
  if (result.queued === 0 && result.skipped === 0) return { notice: "Everyone on this list has already been emailed." };
  return {
    notice: `Emailed ${result.queued} member${result.queued === 1 ? "" : "s"}.${result.skipped ? ` Skipped ${result.skipped} who turned reminders off.` : ""}`,
  };
}
