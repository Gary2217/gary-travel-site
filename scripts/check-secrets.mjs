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
    // 例：const R2_SECRET_ACCESS_KEY = 'abc123...' 或帶型別的 `: string = '...'`
    // 兩個容易踩的陷阱（皆為本掃描器實際犯過的錯）：
    //  1. 變數名字元類必須含數字（0-9）—— 外洩的變數叫 R2_ACCESS_KEY_ID，
    //     少了 0-9 會因那個「2」整條比對失敗。
    //  2. 金鑰名與 [:=] 之間要容許可選的「: 型別」—— 否則 TS 慣用寫法
    //     `const X_SECRET: string = '硬編碼'` 會因中間卡了型別註記而漏抓。
    re: /(?:[A-Za-z0-9_]*(?:SECRET|PASSWORD|PRIVATE_KEY|ACCESS_KEY|SERVICE_ROLE|AUTH_TOKEN|API_KEY)[A-Za-z0-9_]*)\s*(?::\s*[A-Za-z0-9_<>\[\]|,. ]+?)?\s*[:=]\s*['"`][A-Za-z0-9_\-/+=]{16,}['"`]/gi,
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

/**
 * 合法用法：從 env 讀取。不要在此加「跳過整行」的寬鬆規則 ——
 * 例如曾有的 `/: *string/`（想跳過型別宣告）會讓「任何含 `: string` 的行」
 * 整行不掃，而 `const X_SECRET: string = '硬編碼'` 正是 TS 慣用寫法，
 * 等於替硬編碼金鑰開後門（見 trip-format 無關，測試在本檔的回歸案例）。
 * 純型別註記如 `secretKey: string` 本來就不會誤觸 RULES（冒號後無引號），
 * 不需要 allow 規則保護。
 */
const ALLOW = [
  /process\.env\./,
  /getEnv\(/,
  /import\.meta\.env/,
  /\$\{\{\s*secrets\./,   // GitHub Actions ${{ secrets.X }}
];

/** 單行偵測：命中回傳規則名稱，否則 null。walk 與自我測試共用同一條路徑。 */
function scanLine(line) {
  if (ALLOW.some((a) => a.test(line))) return null;
  for (const rule of RULES) {
    rule.re.lastIndex = 0;
    if (rule.re.test(line)) return rule.name;
  }
  return null;
}

/**
 * 自我測試 —— 每次執行前先跑，確保偵測能力沒退化才開始掃描。
 * §3.5「綠燈不等於有效」：這支腳本改過兩次都是「現況通過但實際抓不到」，
 * 故把該抓/不該抓的真實案例釘進來，偵測邏輯一旦退化就當場 exit 2。
 */
const SELF_TEST = {
  shouldCatch: [
    `const R2_ACCESS_KEY_ID = '497e72faeee79a92131728721db2eaba';`,          // 變數名含數字（初版漏抓）
    `const R2_SECRET_ACCESS_KEY: string = 'f61c4806fc4af2e861eda1ec6948';`,   // typed 常數（二版漏抓）
    `  ACCESS_KEY_ID: 'abcdef1234567890abcdef',`,                            // 物件字面值
    `const SERVICE_ROLE_KEY: Readonly<string> = 'abcdefghij0123456789';`,     // 泛型型別
    `"anon_key":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiJ9.dQw4w9WgXcQ_signature123"`, // JWT（三段皆足長）
  ],
  shouldNotCatch: [
    `  secretKey: string;`,                              // interface 純型別宣告
    `function f(apiKey: string) {`,                      // 參數型別
    `const url = process.env.R2_SECRET_ACCESS_KEY;`,     // 讀 env
    `const label: string = '短的';`,                     // 非金鑰名
  ],
};

function runSelfTest() {
  const fails = [];
  for (const s of SELF_TEST.shouldCatch) if (!scanLine(s)) fails.push('漏抓: ' + s);
  for (const s of SELF_TEST.shouldNotCatch) if (scanLine(s)) fails.push('誤判: ' + s);
  if (fails.length > 0) {
    console.error('🔴 check-secrets 自我測試失敗 —— 偵測邏輯退化，掃描結果不可信：');
    fails.forEach((f) => console.error('  ' + f));
    process.exit(2);
  }
}

runSelfTest();

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
      const rule = scanLine(line);
      if (rule) findings.push({ file: full, line: i + 1, rule });
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
