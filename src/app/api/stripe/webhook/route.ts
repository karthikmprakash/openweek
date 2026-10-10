import { applyStripeEvent, getStripeFromEnv } from "@/lib/payments";
import { getDb } from "@/lib/db";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const stripe = getStripeFromEnv();
  const signature = request.headers.get("stripe-signature");
  if (!secret || !stripe || !signature) {
    return Response.json({ error: "Webhook is not configured." }, { status: 400 });
  }
  const payload = await request.text();
  try {
    const event = stripe.webhooks.constructEvent(payload, signature, secret);
    const result = applyStripeEvent(
      getDb(),
      {
        id: event.id,
        type: event.type,
        data: { object: { id: "id" in event.data.object ? String(event.data.object.id) : undefined } },
      },
      new Date(),
    );
    return Response.json({ received: true, duplicate: result.duplicate });
  } catch {
    return Response.json({ error: "Signature was rejected." }, { status: 400 });
  }
}
