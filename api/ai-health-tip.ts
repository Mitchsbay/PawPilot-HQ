import type { VercelRequest, VercelResponse } from '@vercel/node';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const { symptoms = '' } = (req.body ?? {});
    if (!process.env.OPENAI_API_KEY) return res.status(500).json({ error: 'OPENAI_API_KEY missing' });
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: `Pet symptoms: ${symptoms}. Give a short, non-clinical tip.` }]
    });
    res.status(200).json({ tip: completion.choices?.[0]?.message?.content ?? '' });
  } catch (e:any) {
    res.status(500).json({ error: e?.message || 'AI error' });
  }
}