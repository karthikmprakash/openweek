import http from "http";
import { afterEach, describe, expect, it } from "vitest";
import Stripe from "stripe";
import { bookWithCard } from "../src/lib/booking";
import { applyStripeEvent, paymentIntentCreateParams } from "../src/lib/payments";
import { classOn, studioFixture, tempDb } from "./helpers";

const open: Array<{ close: () => void }> = [];
afterEach(() => open.pop()?.close());

async function fakeStripe() {
  const bodies: string[] = [];
  const headers: Array<string | undefined> = [];
  const server = http.createServer((req, res) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => {
      const body = Buffer.concat(chunks).toString("utf8");
      bodies.push(body);
      headers.push(req.headers["stripe-account"] as string | undefined);
      res.writeHead(200, { "content-type": "application/json" });
      if (req.url?.startsWith("/v1/refunds")) {
        res.end(JSON.stringify({ id: "re_test", object: "refund", status: "succeeded" }));
        return;
      }
      res.end(
        JSON.stringify({
          id: "pi_test_direct",
          object: "payment_intent",
          amount: 4000,
          amount_received: 4000,
          currency: "usd",
          status: "succeeded",
          application_fee_amount: null,
          livemode: false,
          client_secret: null,
          metadata: {},
        }),
      );
    });
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("no port");
  const stripe = new Stripe("sk_test_local_only", {
    host: "127.0.0.1",
    port: address.port,
    protocol: "http",
    telemetry: false,
  });
  return {
    stripe,
    bodies,
    headers,
    close: () =>
      new Promise<void>((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      }),
  };
}

describe("bring-your-own Stripe", () => {
  it("creates a direct charge with no application fee and records the booking", async () => {
    const handle = tempDb();
    open.push(handle);
    const gateway = await fakeStripe();
    const now = new Date("2026-06-01T15:00:00.000Z");
    const studio = studioFixture(handle.db, now);
    const { sessionId } = classOn(handle.db, studio.studioId, new Date("2026-06-04T16:00:00.000Z"), { priceCents: 4000, capacity: 2 }, now);
    handle.db.prepare(`UPDATE studios SET stripe_account_id = ? WHERE id = ?`).run("acct_openweek", studio.studioId);

    const params = paymentIntentCreateParams({
      amountCents: 4000,
      currency: "usd",
      metadata: { studio_id: studio.studioId },
      stripeAccountId: "acct_openweek",
      idempotencyKey: "idem-1",
    });
    expect(params).not.toHaveProperty("application_fee_amount");
    expect(JSON.stringify(params)).not.toContain("application_fee");

    const booked = await bookWithCard(
      handle.db,
      gateway.stripe,
      {
        studioId: studio.studioId,
        sessionId,
        guestName: "Avery Lane",
        guestEmail: "avery@example.test",
        idempotencyKey: "idem-1",
        stripeAccountId: "acct_openweek",
      },
      now,
    );
    expect(booked.booking.status).toBe("confirmed");
    expect(booked.spotsLeft).toBe(1);
    expect(gateway.bodies[0]).not.toContain("application_fee");
    expect(gateway.headers[0]).toBe("acct_openweek");

    const payment = handle.db.prepare(`SELECT * FROM payments WHERE booking_id = ?`).get(booked.booking.id) as {
      amount_cents: number;
      application_fee_cents: number | null;
      stripe_payment_intent_id: string;
      status: string;
    };
    expect(payment.amount_cents).toBe(4000);
    expect(payment.application_fee_cents).toBeNull();
    expect(payment.stripe_payment_intent_id).toBe("pi_test_direct");
    expect(payment.status).toBe("succeeded");
    await gateway.close();
  });

  it("applies a signed webhook once", () => {
    const handle = tempDb();
    open.push(handle);
    const stripe = new Stripe("sk_test_local_only", { telemetry: false });
    const now = new Date("2026-06-01T15:00:00.000Z");
    const secret = `whsec_${"ab".repeat(16)}`;
    const payload = JSON.stringify({
      id: "evt_test_1",
      object: "event",
      type: "payment_intent.succeeded",
      data: { object: { id: "pi_from_hook", object: "payment_intent" } },
    });
    const header = stripe.webhooks.generateTestHeaderString({ payload, secret });
    const event = stripe.webhooks.constructEvent(payload, header, secret);
    expect(() => stripe.webhooks.constructEvent(payload, header, "whsec_wrong")).toThrow();
    const first = applyStripeEvent(handle.db, event, now);
    const second = applyStripeEvent(handle.db, event, now);
    expect(first.duplicate).toBe(false);
    expect(second.duplicate).toBe(true);
    const count = handle.db.prepare(`SELECT COUNT(*) AS c FROM stripe_events`).get() as { c: number };
    expect(count.c).toBe(1);
  });
});
