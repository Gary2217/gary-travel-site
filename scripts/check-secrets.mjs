/**
 * 掃描原始碼中是否有硬編碼的金鑰。CI 會在 lint 之前執行，發現即失敗。
 *
 * 存在的理由：2026-07-10 ~ 07-17，scripts/migrate-to-r2.mjs 把 R2 金鑰明文寫進
 * 程式碼並推上 public repo，公開 7 天。當時 CLAUDE.md 已明文禁止硬編碼金鑰 ——
 * 規則沒有擋下它，是後來稽核 R2 時意外撞見的。文字規則擋不住人，這支腳本可以。
 *
 * 本機執行：node scripts/check-secrets.mjs
 */
import { readFileSync, readdirSync, statSync } from 'fs';
import { join, extname } from 'path';

const SCAN_DIRS = ['src', 'scripts', '.github'];
const SCAN_EXTS = new Set(['.ts', '.tsx', '.js', '.mjs', '.cjs', '.json', '.yml', '.yaml']);
const SKIP_DIRS = new Set(['node_modules', '.next', '.git', '__snapshots__', '__fixtures__']);

/** 只比對「賦值給看起來像憑證的變數」+「夠長的字面值」，避免誤判 */
const RULES = [
  {
    name: '硬編碼的金鑰／密鑰',
    // 例：const R2_SECRET_ACCESS_KEY = 'abc123...'
    // 變數名的字元類必須含數字（0-9）—— 實際外洩的變數就叫 R2_ACCESS_KEY_ID，
    // 少了 0-9 會因為那個「2」而整條比對失敗（此掃描器初版就犯了這個錯）。
    re: /(?:[A-Za-z0-9_]*(?:SECRET|PASSWORD|PRIVATE_KEY|ACCESS_KEY|SERVICE_ROLE|AUTH_TOKEN|API_KEY)[A-Za-z0-9_]*)\s*[:=]\s*['"`][A-Za-z0-9_\-/+=]{16,}['"`]/gi,
  },
  {
    name: 'Supabase / JWT 格式的 token',
    re: /['"`]eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}['"`]/g,
  },
  {
    name: 'GitHub Personal Access Token',
    re: /['"`]gh[pousr]_[A-Za-z0-9]{30,}['"`]/g,
  },
];

/** 合法用法：讀 env、讀 process.env、型別宣告 */
const ALLOW = [
  /process\.env\./,
  /getEnv\(/,
  /import\.meta\.env/,
  /\$\{\{\s*secrets\./,   // GitHub Actions ${{ secrets.X }}
  /: *string/,            // 型別宣告
];

const findings = [];

function walk(dir) {
  let entries;
  try { entries = readdirSync(dir); } catch { return; }
  for (const entry of entries) {
    if (SKIP_DIRS.has(entry)) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) { walk(full); continue; }
    if (!SCAN_EXTS.has(extname(entry))) continue;
    if (full.includes('check-secrets')) continue; // 本檔含有樣式，跳過

    const lines = readFileSync(full, 'utf8').split(/\r?\n/);
    lines.forEach((line, i) => {
      if (ALLOW.some((a) => a.test(line))) return;
      for (const rule of RULES) {
        rule.re.lastIndex = 0;
        if (rule.re.test(line)) {
          findings.push({ file: full, line: i + 1, rule: rule.name });
          break;
        }
      }
    });
  }
}

for (const d of SCAN_DIRS) walk(d);

if (findings.length === 0) {
  console.log('✅ 未發現硬編碼金鑰');
  process.exit(0);
}

console.error('\n🔴 發現疑似硬編碼的金鑰 —— 這個 repo 是 public，推上去等於公開給全世界\n');
for (const f of findings) {
  console.error(`  ${f.file}:${f.line}  ${f.rule}`);
}
console.error('\n金鑰只能放 .env.local（本機）與 Vercel 環境變數（正式），程式用 process.env.X 讀取。');
console.error('詳見 CLAUDE.md §9 的金鑰處理鐵則與事故紀錄。\n');
process.exit(1);
