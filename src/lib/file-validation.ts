/**
 * 透過檔案 magic bytes 驗證真實檔案類型
 * 防止 MIME type 偽造攻擊
 */

const SIGNATURES: { mime: string; bytes: number[] }[] = [
  { mime: 'image/jpeg', bytes: [0xFF, 0xD8, 0xFF] },
  { mime: 'image/png', bytes: [0x89, 0x50, 0x4E, 0x47] },
  { mime: 'image/webp', bytes: [0x52, 0x49, 0x46, 0x46] }, // RIFF header
  { mime: 'image/svg+xml', bytes: [0x3C] }, // starts with '<'
];

/**
 * 驗證 buffer 的 magic bytes 是否符合宣稱的 MIME type
 */
export function validateFileSignature(buffer: Buffer, claimedMime: string): boolean {
  // SVG 特殊處理：檢查是否為有效的 XML/SVG 開頭
  if (claimedMime === 'image/svg+xml') {
    const head = buffer.subarray(0, 256).toString('utf-8').trim();
    return head.startsWith('<') && (head.includes('<svg') || head.includes('<?xml'));
  }

  const matchingSig = SIGNATURES.find(s => s.mime === claimedMime);
  if (!matchingSig) return false;

  if (buffer.length < matchingSig.bytes.length) return false;

  return matchingSig.bytes.every((byte, i) => buffer[i] === byte);
}
