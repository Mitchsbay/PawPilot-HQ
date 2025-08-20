import type { VercelRequest, VercelResponse } from '@vercel/node';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!); // <- no apiVersion

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== 'POST') {
      res.status(405).send('Method Not Allowed');
      return;
    }

    const { priceId } = (req.body || {}) as { priceId?: string };
    if (!priceId) {
      res.status(400).json({ error: 'Missing priceId' });
      return;
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${process.env.PUBLIC_SITE_URL}/donations?success=1`,
      cancel_url: `${process.env.PUBLIC_SITE_URL}/donations?canceled=1`,
    });

    res.status(200).json({ url: session.url });
  } catch (err: any) {
    console.error('checkout error', err);
    res.status(500).json({ error: 'checkout_failed' });
  }
}
