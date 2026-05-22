import { readFile } from 'fs/promises';
import path from 'path';

export const runtime = 'nodejs';
export const size = { width: 180, height: 180 };
export const contentType = 'image/svg+xml';

export default async function AppleIcon() {
  const filePath = path.join(process.cwd(), 'public', 'travel-logo.svg');
  const file = await readFile(filePath);
  return new Response(file, {
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
}
