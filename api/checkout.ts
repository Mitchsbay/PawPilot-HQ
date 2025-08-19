import type { VercelRequest, VercelResponse } from '@vercel/node';
import Stripe from 'stripe';
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2022-11-15' });

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const { priceId, success_url, cancel_url } = (req.body ?? {});
    if (!process.env.STRIPE_SECRET_KEY) return res.status(500).json({ error: 'STRIPE_SECRET_KEY missing' });
    if (!priceId) return res.status(400).json({ error: 'priceId required' });
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: success_url || `${req.headers['x-forwarded-proto'] ?? 'https'}://${req.headers.host}/donate/success`,
      cancel_url: cancel_url || `${req.headers['x-forwarded-proto'] ?? 'https'}://${req.headers.host}/donate`
    });
    return res.status(200).json({ url: session.url });
  } catch (e:any) {
    return res.status(500).json({ error: e?.message || 'Stripe error' });
  }
}