import type { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';

function findMediaBlobLocally(mediaUrl: string): { dataUrl: string; contentType: string } | null {
  try {
    const parsed = new URL(mediaUrl, 'http://localhost');
    const pathname = decodeURIComponent(parsed.pathname);
    const cleanName = path.basename(pathname).replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ');
    if (!cleanName || cleanName.length < 2) return null;

    // Search authoring/items recursively for matching YAML items
    const baseDir = path.resolve(process.cwd(), '../authoring/items');
    if (!fs.existsSync(baseDir)) return null;

    const walk = (dir: string): { dataUrl: string; contentType: string } | null => {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const ent of entries) {
        const full = path.join(dir, ent.name);
        if (ent.isDirectory()) {
          const res = walk(full);
          if (res) return res;
        } else if (ent.isFile() && ent.name.toLowerCase().endsWith('.yml')) {
          const base = path.basename(ent.name, '.yml').toLowerCase();
          if (
            base === cleanName.toLowerCase() ||
            base.replace(/\s+/g, '') === cleanName.toLowerCase().replace(/\s+/g, '')
          ) {
            const content = fs.readFileSync(full, 'utf8');
            const blobMatch = content.match(/Hint:\s*Blob[\s\S]*?Value:\s*([A-Za-z0-9+/=\s]+)/);
            if (blobMatch) {
              const rawBase64 = blobMatch[1].replace(/\s+/g, '');
              let contentType = 'image/jpeg';
              if (rawBase64.startsWith('UklG')) contentType = 'image/webp';
              else if (rawBase64.startsWith('iVBORw')) contentType = 'image/png';
              else if (rawBase64.startsWith('PHN2Zy') || rawBase64.startsWith('PD94bWw')) contentType = 'image/svg+xml';
              return { dataUrl: `data:${contentType};base64,${rawBase64}`, contentType };
            }
          }
        }
      }
      return null;
    };

    return walk(baseDir);
  } catch (err) {
    console.warn('Error finding local media blob:', err);
    return null;
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { url } = req.query;
  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'Missing url parameter' });
  }

  try {
    // Support relative and absolute URLs
    const targetUrl = url.startsWith('http')
      ? url
      : `${req.headers['x-forwarded-proto'] || 'http'}://${req.headers.host || 'localhost:3000'}${url.startsWith('/') ? '' : '/'}${url}`;

    try {
      const response = await fetch(targetUrl, { redirect: 'manual' });
      const contentType = response.headers.get('content-type') || '';

      if (response.ok && contentType.startsWith('image/')) {
        const arrayBuffer = await response.arrayBuffer();
        const base64 = Buffer.from(arrayBuffer).toString('base64');
        const dataUrl = `data:${contentType};base64,${base64}`;
        return res.status(200).json({ dataUrl, contentType });
      }
    } catch {
      // Fetch failed or redirected, try local authoring lookup below
    }

    // Fallback: search local authoring/items serialized media for matching image blob
    const localBlob = findMediaBlobLocally(targetUrl);
    if (localBlob) {
      return res.status(200).json(localBlob);
    }

    return res.status(404).json({ error: 'Image not found or not accessible without authentication' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Error proxying image' });
  }
}

