import { NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/lib/db";

function isPaidStatus(status: Stripe.Subscription.Status) {
  return status === "active" || status === "trialing";
}

async function syncSubscription(stripe: Stripe, subscription: Stripe.Subscription) {
  const customerId = typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id;
  const periodEnd = subscription.current_period_end ? new Date(subscription.current_period_end * 1000) : null;

  await prisma.user.updateMany({
    where: { stripeCustomerId: customerId },
    data: {
      plan: isPaidStatus(subscription.status) ? "PRO" : "FREE",
      stripeSubscriptionId: subscription.id,
      stripeCurrentPeriodEnd: periodEnd,
    },
  });
}

export async function POST(req: Request) {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secretKey || !webhookSecret) {
    return NextResponse.json({ error: "Stripe no está configurado." }, { status: 503 });
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) return NextResponse.json({ error: "Falta la firma." }, { status: 400 });

  const body = await req.text();
  const stripe = new Stripe(secretKey);
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (error) {
    console.error("YAMA AI — firma de Stripe inválida:", error);
    return NextResponse.json({ error: "Firma inválida." }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (typeof session.subscription === "string") {
          const subscription = await stripe.subscriptions.retrieve(session.subscription);
          await syncSubscription(stripe, subscription);
        }
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.paused":
      case "customer.subscription.resumed": {
        await syncSubscription(stripe, event.data.object as Stripe.Subscription);
        break;
      }
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id;
        await prisma.user.updateMany({
          where: { stripeCustomerId: customerId },
          data: { plan: "FREE", stripeSubscriptionId: null, stripeCurrentPeriodEnd: null },
        });
        break;
      }
    }
  } catch (error) {
    console.error("YAMA AI — fallo procesando webhook de Stripe:", error);
    return NextResponse.json({ error: "Fallo interno." }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
