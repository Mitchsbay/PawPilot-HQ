import type { VercelRequest, VercelResponse } from '@vercel/node';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!); // <- no apiVersion

export const config = { api: { bodyParser: false } };

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== 'POST') {
      res.status(405).send('Method Not Allowed');
      return;
    }

    const sig = req.headers['stripe-signature'] as string | undefined;
    if (!sig) {
      res.status(400).send('Missing Stripe signature header');
      return;
    }

    const buf = await getRawBody(req);
    const event = stripe.webhooks.constructEvent(
      buf,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );

    // Handle the events you care about
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      // TODO: mark payment complete, etc.
      console.log('Checkout completed:', session.id);
    }

    res.status(200).json({ received: true });
  } catch (err: any) {
    console.error('webhook error', err?.message ?? err);
    res.status(400).send(`Webhook Error: ${err?.message ?? 'unknown'}`);
  }
}

function getRawBody(req: VercelRequest): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}
