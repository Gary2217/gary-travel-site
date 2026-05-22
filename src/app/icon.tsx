import { readFile } from 'fs/promises';
import path from 'path';

export const runtime = 'nodejs';
export const size = { width: 32, height: 32 };
export const contentType = 'image/svg+xml';

export default async function Icon() {
  const filePath = path.join(process.cwd(), 'public', 'travel-logo.svg');
  const file = await readFile(filePath);
  return new Response(file, {
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
}
