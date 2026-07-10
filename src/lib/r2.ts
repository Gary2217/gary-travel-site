import {
  S3Client,
  PutObjectCommand,
  DeleteObjectsCommand,
  ListObjectsV2Command,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const R2_ACCOUNT_ID = 'a85c4f2e46761d22faa6ad37731d6d92';
const R2_BUCKET = 'gary-travel-media';

export const R2_PUBLIC_BASE = 'https://pub-3881231e994f4158b5d05c0ec109b3ef.r2.dev';

function client() {
  return new S3Client({
    region: 'auto',
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
  });
}

export function r2PublicUrl(key: string): string {
  return `${R2_PUBLIC_BASE}/${key}`;
}

/** R2 公開 URL（可能帶 ?v=...）→ 乾淨的 object key；非 R2 URL 回傳 null */
export function r2KeyFromUrl(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.origin !== new URL(R2_PUBLIC_BASE).origin) return null;
    return u.pathname.slice(1) || null;
  } catch {
    return null;
  }
}

export async function r2Upload(key: string, body: Buffer, contentType: string): Promise<void> {
  await client().send(
    new PutObjectCommand({ Bucket: R2_BUCKET, Key: key, Body: body, ContentType: contentType }),
  );
}

export async function r2Delete(keys: string[]): Promise<void> {
  if (keys.length === 0) return;
  await client().send(
    new DeleteObjectsCommand({ Bucket: R2_BUCKET, Delete: { Objects: keys.map((Key) => ({ Key })) } }),
  );
}

export interface R2Object {
  key: string;
  lastModified?: Date;
}

/** 列出指定 prefix 下所有物件（自動翻頁） */
export async function r2List(prefix: string): Promise<R2Object[]> {
  const out: R2Object[] = [];
  let token: string | undefined;
  do {
    const res = await client().send(
      new ListObjectsV2Command({ Bucket: R2_BUCKET, Prefix: prefix, ContinuationToken: token }),
    );
    for (const o of res.Contents || []) {
      if (o.Key) out.push({ key: o.Key, lastModified: o.LastModified });
    }
    token = res.IsTruncated ? res.NextContinuationToken : undefined;
  } while (token);
  return out;
}

/** 產生瀏覽器直傳用的 presigned PUT URL（PDF 等大檔繞過 Vercel） */
export async function r2PresignedPut(key: string, contentType: string, expiresIn = 600): Promise<string> {
  return getSignedUrl(
    client(),
    new PutObjectCommand({ Bucket: R2_BUCKET, Key: key, ContentType: contentType }),
    { expiresIn },
  );
}
