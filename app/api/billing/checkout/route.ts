import { NextResponse } from "next/server";
import Stripe from "stripe";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "No autenticado." }, { status: 401 });

  const secretKey = process.env.STRIPE_SECRET_KEY;
  const priceId = process.env.STRIPE_PRICE_ID_PRO;
  const appUrl = process.env.NEXTAUTH_URL;
  if (!secretKey || !priceId || !appUrl) {
    console.error("YAMA AI — Stripe no está configurado: faltan STRIPE_SECRET_KEY, STRIPE_PRICE_ID_PRO o NEXTAUTH_URL.");
    return NextResponse.json({ error: "Los pagos todavía no están configurados. Intenta más tarde." }, { status: 503 });
  }

  const stripe = new Stripe(secretKey);
  const userId = (session.user as any).id as string;
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return NextResponse.json({ error: "Usuario no encontrado." }, { status: 404 });
  if (user.plan === "PRO") return NextResponse.json({ error: "Tu cuenta ya tiene el plan Pro." }, { status: 409 });

  let customerId = user.stripeCustomerId;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      metadata: { userId },
    });
    customerId = customer.id;
    await prisma.user.update({ where: { id: userId }, data: { stripeCustomerId: customerId } });
  }

  try {
    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${appUrl}/?upgraded=true`,
      cancel_url: `${appUrl}/?upgraded=cancel`,
      client_reference_id: userId,
      metadata: { userId },
      subscription_data: { metadata: { userId } },
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (error) {
    console.error("YAMA AI — fallo creando Checkout Session de Stripe:", error);
    return NextResponse.json({ error: "No se pudo iniciar el pago. Intenta de nuevo." }, { status: 502 });
  }
}
