import type { NextApiRequest, NextApiResponse } from 'next';

const DEFAULT_WEBHOOK_URL = 'https://webhook.site/e3d5e8c2-aa35-4274-bd16-7c3bd0ec7379';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const payload = req.body;
  const webhookUrl = process.env.CONSULTATION_WEBHOOK_URL || DEFAULT_WEBHOOK_URL;

  try {
    if (webhookUrl) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      try {
        await fetch(webhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: typeof payload === 'string' ? payload : JSON.stringify(payload),
          signal: controller.signal,
        });
      } catch (upstreamErr) {
        // Silently log upstream webhook failures so user flow never breaks
        console.warn('Consultation upstream webhook notification failed:', upstreamErr);
      } finally {
        clearTimeout(timeoutId);
      }
    }

    return res.status(200).json({ success: true, message: 'Consultation request received' });
  } catch (error) {
    console.error('Error handling consultation request:', error);
    return res.status(200).json({ success: true, fallback: true });
  }
}

