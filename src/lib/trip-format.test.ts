import { describe, it, expect } from 'vitest';
import {
  parsePriceDetail,
  stringifyPriceDetail,
  buildDepartureInfoPayload,
  DEFAULT_PRICE_DETAIL,
  displayAdultUnit,
  displayChildPrice,
  displayInfantUnit,
  formatSingleRoomText,
  type PriceDetailContent,
  type DepartureInfoDraft,
} from './trip-format';
import realPriceDetails from './__fixtures__/price-detail-real.json';

/**
 * 複製 src/components/trip/PriceInfoModal.tsx 的顯示邏輯。
 *
 * 為什麼可以只測這一個元件就代表全部：
 * page.tsx 中 parsePriceDetail 的結果只存在 priceDetailPreview 一個變數，
 * 而它唯一的出口就是 <PriceInfoModal detail={priceDetailPreview} />。
 * 換言之 PriceInfoModal 是 price_detail 的完整客人可見面。
 *
 * 若日後 PriceInfoModal 的渲染方式改變，此處必須同步 —— 這是刻意的取捨：
 * 換得零依賴（不需 jsdom / testing-library）就能鎖住顯示輸出。
 */
function renderPriceModal(detail: PriceDetailContent) {
  return {
    大人: displayAdultUnit(detail.adultPrice),
    小孩佔床: displayChildPrice(detail.childWithBedPrice),
    小孩不佔床: displayChildPrice(detail.childNoBedPrice),
    加床: displayChildPrice(detail.childExtraBedPrice),
    嬰兒: displayInfantUnit(detail.infantPrice),
    單人房差: formatSingleRoomText(detail.singleRoom),
    // PriceInfoModal:74 — 整個「包含項目」區塊的顯示條件
    包含項目是否顯示: Boolean(detail.surcharge || detail.visaFee),
    // PriceInfoModal:77
    包含項目:
      [detail.surcharge, detail.visaFee]
        .filter((v) => v && v !== '售價已內含' && v !== '免簽證')
        .join('，') || '含機場稅燃油附加費',
    // PriceInfoModal:80
    不包含項目是否顯示: Boolean(detail.quoteNote && detail.quoteNote !== '《無特殊說明》'),
    不包含項目: detail.quoteNote,
  };
}

describe('parsePriceDetail — 真實資料 characterization', () => {
  /**
   * 安全網核心。
   *
   * fixture 是從正式 DB 撈出的全部 86 筆唯一 price_detail
   * （對應 258 個行程／906 個梯次；梯次間大量重複，去重後為 86 筆。
   *   parsePriceDetail 是純函式，相同輸入必然相同輸出，故 86 筆即涵蓋全部 906 筆）。
   *
   * 這份快照鎖住的是「客人現在看到什麼」。任何對 parsePriceDetail 的修改
   * 若讓任一格輸出改變，此測試會變紅 —— 那就代表真的改壞了。
   *
   * 重新產生 fixture：node scripts/dump-price-detail-fixture.mjs
   */
  it('全部真實資料的顯示輸出維持不變', () => {
    const rendered = (realPriceDetails as string[]).map((raw) => renderPriceModal(parsePriceDetail(raw)));
    expect(rendered).toMatchSnapshot();
  });

  it('fixture 仍涵蓋含空字串的欄位（否則此安全網形同虛設）', () => {
    const parsedRaw = (realPriceDetails as string[]).map((r) => JSON.parse(r));
    const countEmpty = (f: string) => parsedRaw.filter((p) => p[f] === '').length;

    // 這三個欄位在正式資料中存有空字串，正是 Stage 3 會動到的部分。
    // 若哪天 fixture 重產後這些歸零，代表快照已無法證明 ?? 的安全性。
    expect(countEmpty('infantPrice')).toBeGreaterThan(0);
    expect(countEmpty('childExtraBedPrice')).toBeGreaterThan(0);
    expect(countEmpty('childNoBedPrice')).toBeGreaterThan(0);
  });
});

describe('parsePriceDetail — 邊界行為', () => {
  it('空字串回傳完整預設值', () => {
    expect(parsePriceDetail('')).toEqual(DEFAULT_PRICE_DETAIL);
    expect(parsePriceDetail('   ')).toEqual(DEFAULT_PRICE_DETAIL);
  });

  it('非 JSON 文字走 legacy 模式，原文放進 groupNote', () => {
    expect(parsePriceDetail('這是舊格式的純文字說明')).toEqual({
      ...DEFAULT_PRICE_DETAIL,
      groupNote: '這是舊格式的純文字說明',
    });
  });

  it('字串 "null" 不會被當成物件（typeof null === "object" 的陷阱有被防到）', () => {
    expect(parsePriceDetail('null')).toEqual({ ...DEFAULT_PRICE_DETAIL, groupNote: 'null' });
  });

  it('純數字字串走 legacy 模式（JSON.parse 出來是 number，非 object）', () => {
    expect(parsePriceDetail('123')).toEqual({ ...DEFAULT_PRICE_DETAIL, groupNote: '123' });
  });

  it('legacy key（included/excluded/notes）會回填到新欄位', () => {
    const parsed = parsePriceDetail(
      JSON.stringify({ included: '含早餐', excluded: '不含小費', notes: '需簽證' }),
    );
    expect(parsed.groupNote).toBe('含早餐');
    expect(parsed.quoteNote).toBe('不含小費');
    expect(parsed.visaNote).toBe('需簽證');
  });
});

describe('Bug B — 售價欄位無法清空（已修復）', () => {
  /**
   * 原因：parsePriceDetail 曾使用 `parsed.X || DEFAULT.X`，
   * `||` 把空字串視為假值，導致「存 '' → 讀回預設值」，round-trip 不是 identity。
   * 後果：開發者清空某個售價欄位並儲存後，重開編輯器該欄位又變回預設文字。
   *
   * 修法：6 個售價欄位改用 `??`，只有 undefined 才套預設值。
   */
  it('round-trip 為 identity：存什麼就讀回什麼', () => {
    const cleared: PriceDetailContent = { ...DEFAULT_PRICE_DETAIL, infantPrice: '', adultPrice: '' };
    expect(parsePriceDetail(stringifyPriceDetail(cleared))).toEqual(cleared);
  });

  it('清空的售價欄位會原樣保留，不再被預設值蓋回去', () => {
    const cleared: PriceDetailContent = { ...DEFAULT_PRICE_DETAIL, infantPrice: '', adultPrice: '', singleRoom: '' };
    const readBack = parsePriceDetail(stringifyPriceDetail(cleared));
    expect(readBack.infantPrice).toBe('');
    expect(readBack.adultPrice).toBe('');
    expect(readBack.singleRoom).toBe('');
  });

  it('欄位不存在（undefined）時仍套用預設值 —— ?? 只攔 undefined', () => {
    const parsed = parsePriceDetail(JSON.stringify({ title: '只有標題' }));
    expect(parsed.adultPrice).toBe(DEFAULT_PRICE_DETAIL.adultPrice);
    expect(parsed.infantPrice).toBe(DEFAULT_PRICE_DETAIL.infantPrice);
    expect(parsed.singleRoom).toBe(DEFAULT_PRICE_DETAIL.singleRoom);
  });

  it('關鍵前提：顯示層對空字串自有 fallback，所以 parse 回傳空字串時客人仍看到「洽詢」', () => {
    // 這是 Stage 3 能安全改用 ?? 的根本原因：
    // 即使 parse 回傳 ''，顯示層 formatPerPersonPrice 仍會輸出「洽詢」，
    // 與目前由 DEFAULT_PRICE_DETAIL 提供的「洽詢」完全相同。
    expect(displayInfantUnit('')).toBe('洽詢');
    expect(displayAdultUnit('')).toBe('洽詢');
    expect(displayChildPrice('')).toBe('洽詢');
    expect(displayInfantUnit('')).toBe(DEFAULT_PRICE_DETAIL.infantPrice);
  });

  it('對照：無顯示層 fallback 的文字欄位不可改用 ??（會讓畫面開天窗）', () => {
    // groupNote/quoteNote/visaNote/title 等沒有第二層 fallback，
    // 且 groupNote 等另有 `parsed.X || parsed.legacyKey || DEFAULT.X` 的相容鏈。
    // 改成 ?? 會讓空字串直接穿透到畫面，且破壞 legacy 回填。
    const parsed = parsePriceDetail(JSON.stringify({ groupNote: '', included: '含早餐' }));
    expect(parsed.groupNote).toBe('含早餐');
  });
});

describe('buildDepartureInfoPayload — 寫入 DB 的售價 payload', () => {
  const draft = (over: Partial<PriceDetailContent> = {}, rest: Partial<DepartureInfoDraft> = {}): DepartureInfoDraft => ({
    groupCode: 'ABC123',
    waitlist: '',
    detail: { ...DEFAULT_PRICE_DETAIL, ...over },
    ...rest,
  });

  it('所有欄位都會被 trim', () => {
    const p = buildDepartureInfoPayload(
      draft({ adultPrice: '  49900  ', groupNote: '\t備註\n' }, { groupCode: '  ABC123  ' }),
      null,
    );
    expect(p.group_code).toBe('ABC123');
    const d = JSON.parse(p.price_detail);
    expect(d.adultPrice).toBe('49900');
    expect(d.groupNote).toBe('備註');
  });

  it('waitlist 空字串 → 0（不是 null，也不是 NaN）', () => {
    expect(buildDepartureInfoPayload(draft({}, { waitlist: '' }), null).waitlist_count).toBe(0);
    expect(buildDepartureInfoPayload(draft({}, { waitlist: '5' }), null).waitlist_count).toBe(5);
  });

  it('round-trip：寫進去的 payload 讀回來要一致', () => {
    const detail: PriceDetailContent = { ...DEFAULT_PRICE_DETAIL, adultPrice: '49900', infantPrice: '10000' };
    const p = buildDepartureInfoPayload(draft(detail), null);
    const readBack = parsePriceDetail(p.price_detail);
    expect(readBack.adultPrice).toBe('49900');
    expect(readBack.infantPrice).toBe('10000');
  });

  describe('deposit 的三層 fallback（既有行為，非期望行為）', () => {
    /**
     * deposit 走 `草稿 || banner的deposit_label || 預設值`。
     * 用 || 意即空字串會穿透到下一層 —— 訂金欄位「清不掉」。
     * 這與 parsePriceDetail 讀取端曾有的問題同類，但兩者獨立。
     * 此處僅釘住現況；要修需另案處理（會改變既有行程的訂金顯示）。
     */
    it('草稿有值 → 用草稿', () => {
      const p = buildDepartureInfoPayload(draft({ deposit: '5000' }), '9999');
      expect(JSON.parse(p.price_detail).deposit).toBe('5000');
    });

    it('草稿為空 → 落到 banner 的 deposit_label（← 清不掉的原因）', () => {
      const p = buildDepartureInfoPayload(draft({ deposit: '' }), '9999');
      expect(JSON.parse(p.price_detail).deposit).toBe('9999');
    });

    it('草稿與 banner 皆空 → 落到預設值', () => {
      const p = buildDepartureInfoPayload(draft({ deposit: '' }), null);
      expect(JSON.parse(p.price_detail).deposit).toBe(DEFAULT_PRICE_DETAIL.deposit);
    });

    it('depositLabel 為數字型別也能處理（DB 可能存 number）', () => {
      const p = buildDepartureInfoPayload(draft({ deposit: '' }), 8000);
      expect(JSON.parse(p.price_detail).deposit).toBe('8000');
    });

    it('depositLabel 為 0 時視為未設定（|| 的既有行為）', () => {
      const p = buildDepartureInfoPayload(draft({ deposit: '' }), 0);
      expect(JSON.parse(p.price_detail).deposit).toBe(DEFAULT_PRICE_DETAIL.deposit);
    });
  });

  it('產出的 price_detail 是合法 JSON 且含全部 15 個欄位', () => {
    const p = buildDepartureInfoPayload(draft(), null);
    const d = JSON.parse(p.price_detail);
    expect(Object.keys(d).sort()).toEqual(Object.keys(DEFAULT_PRICE_DETAIL).sort());
  });
});
