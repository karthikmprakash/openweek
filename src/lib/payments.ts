import Stripe from "stripe";
import type { Db } from "./db";
import { DomainError } from "./errors";

export type ChargeRequest = {
  amountCents: number;
  currency: string;
  metadata: Record<string, string>;
  stripeAccountId: string | null;
  idempotencyKey: string;
};

export type ChargeResult = {
  id: string;
  applicationFeeAmount: number | null;
  status: string;
};

/**
 * Direct charge on the studio's own Stripe account.
 * application_fee_amount is intentionally absent. A non-zero fee is rejected
 * both before the request and on the response.
 */
export function paymentIntentCreateParams(req: ChargeRequest): Stripe.PaymentIntentCreateParams {
  if (req.amountCents < 50) {
    throw new DomainError("Card charges need to be at least 50 cents.", "amount");
  }
  const params: Stripe.PaymentIntentCreateParams = {
    amount: req.amountCents,
    currency: req.currency,
    confirm: true,
    payment_method: "pm_card_visa",
    allowed_payment_method_types: ["card"],
    metadata: req.metadata,
  };
  assertParamsHaveNoPlatformFee(params);
  return params;
}

export function assertParamsHaveNoPlatformFee(params: Stripe.PaymentIntentCreateParams): void {
  const record = params as unknown as Record<string, unknown>;
  if (record.application_fee_amount != null && record.application_fee_amount !== 0) {
    throw new DomainError("StudioFlat never adds a platform fee.", "platform_fee");
  }
  if ("application_fee_amount" in record && record.application_fee_amount) {
    throw new DomainError("StudioFlat never adds a platform fee.", "platform_fee");
  }
  if (record.application_fee != null) {
    throw new DomainError("StudioFlat never adds a platform fee.", "platform_fee");
  }
}

export async function createDirectCharge(stripe: Stripe, req: ChargeRequest): Promise<ChargeResult> {
  const params = paymentIntentCreateParams(req);
  const options: Stripe.RequestOptions = { idempotencyKey: req.idempotencyKey };
  if (req.stripeAccountId) options.stripeAccount = req.stripeAccountId;
  const intent = await stripe.paymentIntents.create(params, options);
  if (intent.application_fee_amount != null && intent.application_fee_amount !== 0) {
    throw new DomainError("Refusing a payment that includes a platform fee.", "platform_fee");
  }
  return {
    id: intent.id,
    applicationFeeAmount: intent.application_fee_amount ?? null,
    status: intent.status,
  };
}

export function getStripeFromEnv(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  const host = process.env.STRIPE_API_HOST;
  const port = process.env.STRIPE_API_PORT;
  const protocol = process.env.STRIPE_API_PROTOCOL === "http" || process.env.STRIPE_API_PROTOCOL === "https"
    ? process.env.STRIPE_API_PROTOCOL
    : undefined;
  return new Stripe(key, {
    telemetry: false,
    ...(host ? { host } : {}),
    ...(port ? { port } : {}),
    ...(protocol ? { protocol } : {}),
  });
}

export type PaymentKind = "drop_in" | "pack" | "membership" | "late_fee" | "no_show_fee";

export function insertPayment(
  db: Db,
  input: {
    studioId: string;
    bookingId?: string | null;
    memberId?: string | null;
    productId?: string | null;
    amountCents: number;
    currency?: string;
    applicationFeeCents: number | null;
    stripePaymentIntentId?: string | null;
    idempotencyKey?: string | null;
    status: "requires_payment" | "succeeded" | "failed" | "refunded";
    kind: PaymentKind;
  },
  now: Date,
): string {
  if (input.applicationFeeCents != null && input.applicationFeeCents !== 0) {
    throw new DomainError("Refusing to store a platform fee.", "platform_fee");
  }
  const id = crypto.randomUUID();
  db.prepare(
    `INSERT INTO payments (
      id, studio_id, booking_id, member_id, product_id, amount_cents, currency,
      application_fee_cents, stripe_payment_intent_id, idempotency_key, status, kind, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    input.studioId,
    input.bookingId ?? null,
    input.memberId ?? null,
    input.productId ?? null,
    input.amountCents,
    input.currency ?? "usd",
    input.applicationFeeCents === 0 ? 0 : null,
    input.stripePaymentIntentId ?? null,
    input.idempotencyKey ?? null,
    input.status,
    input.kind,
    now.toISOString(),
  );
  return id;
}

export function applyStripeEvent(
  db: Db,
  event: { id: string; type: string; data: { object: { id?: string; metadata?: Record<string, string> } } },
  now: Date,
): { duplicate: boolean } {
  const existing = db.prepare(`SELECT id FROM stripe_events WHERE id = ?`).get(event.id) as { id: string } | undefined;
  if (existing) return { duplicate: true };
  db.transaction(() => {
    db.prepare(`INSERT INTO stripe_events (id, type, received_at) VALUES (?, ?, ?)`).run(
      event.id,
      event.type,
      now.toISOString(),
    );
    if (event.type === "payment_intent.succeeded" && event.data.object.id) {
      db.prepare(`UPDATE payments SET status = 'succeeded' WHERE stripe_payment_intent_id = ?`).run(event.data.object.id);
    }
    if (event.type === "payment_intent.payment_failed" && event.data.object.id) {
      db.prepare(`UPDATE payments SET status = 'failed' WHERE stripe_payment_intent_id = ?`).run(event.data.object.id);
    }
  })();
  return { duplicate: false };
}
