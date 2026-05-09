export type MiniTransitTicketId = "mtl001" | "mtl002" | "mtl003" | "mtl004" | "mtl005";

export type MiniTransitTicketItem = {
  id: MiniTransitTicketId;
  title: string;
  summary: string;
  image: string;
  departureLabel: string;
  requirements: string[];
  regularTitle: string;
  regularPrice: number;
  urgentTitle: string;
  urgentPrice: number;
};

const SHARED_REQUIREMENTS_PREFIX = [
  "STEP 1 在下方方案裡面選擇要購買方案的人數",
  "STEP 2 在日曆表選擇出發日期，並在訂購備註欄裡面標註回程日期",
  "STEP 3 在加價購處選擇要搭乘的航班及船班，如只購買單程即選去程航班即可",
  "STEP 4 如要加價回程航班及船班，即在回程選擇航班及船班",
  "STEP 5 選擇完畢後在上方按加入購物車，並按照步驟填寫訂單資料",
  "STEP 6 送出訂單後，請耐心等待客服人員與您聯絡",
  "## 小三通通關流程",
  "1. 持身份證或護照從台灣機場飛往金門",
  "2. 抵達金門機場後—專人接機(電話聯繫或舉牌)--前往金門水頭碼頭",
  "3. 將護照及台胞證交由我們專人辦理出船票手續",
  "4. 返回金門時,旅客持護照及台胞證至廈門五通碼頭2樓-福建台灣青年之家-報到換取船票",
  "5. 回到金門後，由專人接船接至金門機場辦理登機返回台灣",
  "## 費用包含",
];

const SHARED_REQUIREMENTS_SUFFIX = [
  "【船票】金門水頭碼頭⇋廈門五通碼頭（單程 或 來回船票）或 金門水頭碼頭⇋泉州石井碼頭（單程 或 來回船票）",
  "【接駁】金門尚義機場⇋金門水頭碼頭（單程 或 來回接駁）",
  "## 注意事項",
  "1、機票開立完成後，航點無法更改。",
  "2、套券僅限本人使用。",
  "3、自2023年起，行李無直掛，請旅客下機後於自行領取託運行李出關。",
  "4、國內限托運行李每人一件10公斤／手提行李每人一件7公斤。(如超出限重公斤數 , 需自行現場支付超費用,行李上限30公斤)。",
  "5、飛機航班與小三通船班轉乘時間，務必間隔兩小時以上。",
  "6、金門/廈門碼頭---隨身攜帶行李/自提行李：",
  "※旅客每人可攜帶2件，總重不得超過27公斤。",
  "※持兒童票旅客每人可攜帶2件，總重不得超過17公斤。",
  "7、行程限當日當班次，開票後請遵守以下規則：",
  "※更改行程：將依規定收取手續費單程300/趟/人/次。",
  "※取消辦退：出發日的5天前通知,套券不可分開退票,將依規定收取退票手續費；若於2天內通知取消，則無退票價值。",
  "※連續假期：連假禁運期機票一經開票，無退票價值。",
  "8、若遇航班、船班因天候或不可抗因素取消，請務必索取航/船班證明，申請免扣手續費之退票退票結果由航空/船運公司裁定）。",
  "9、❗❗注意❗❗ 大陸籍旅客須為陸籍配偶的一等親才可搭乘小三通。",
  "## 訂購時請於備註欄位確實提供下列資訊(必填)",
  "(1) 中文姓名。",
  "(2) 身分證字號。",
  "(3) 出生年月日。",
  "(4) 台胞證號+台胞證效期+台胞證簽數。",
  "(5) 搭乘日期及時間。",
  "(6) 手機號碼。",
  "(7) 訂位小叮嚀：旅客證號部分，除外籍旅客(提供護照號碼)，台灣及大陸籍旅客請務必提供身分證字號。",
  "如需僅訂購單程者，請電洽客服人員。",
];

function buildRequirements(flightText: string) {
  return [...SHARED_REQUIREMENTS_PREFIX, flightText, ...SHARED_REQUIREMENTS_SUFFIX];
}

export const MINI_TRANSIT_TICKET_ITEMS: MiniTransitTicketItem[] = [
  {
    id: "mtl001",
    title: "金廈小三通票券-松山出發",
    summary: "請來電洽詢（實際票務依客服確認）",
    image: "https://images.unsplash.com/photo-1474302770737-173ee21bab63?auto=format&fit=crop&w=1200&q=80",
    departureLabel: "台北松山出發",
    requirements: buildRequirements("【機票】台灣松山機場⇋金門尚義機場（單程 或 來回機票）"),
    regularTitle: "一般票券",
    regularPrice: 1,
    urgentTitle: "急件處理",
    urgentPrice: 1,
  },
  {
    id: "mtl002",
    title: "金廈小三通票券-高雄出發",
    summary: "請來電洽詢（實際票務依客服確認）",
    image: "https://images.unsplash.com/photo-1474302770737-173ee21bab63?auto=format&fit=crop&w=1200&q=80",
    departureLabel: "高雄出發",
    requirements: buildRequirements("【機票】台灣高雄機場⇋金門尚義機場（單程 或 來回機票）"),
    regularTitle: "一般票券",
    regularPrice: 1,
    urgentTitle: "急件處理",
    urgentPrice: 1,
  },
  {
    id: "mtl003",
    title: "金廈小三通票券-台中出發",
    summary: "請來電洽詢（實際票務依客服確認）",
    image: "https://images.unsplash.com/photo-1474302770737-173ee21bab63?auto=format&fit=crop&w=1200&q=80",
    departureLabel: "台中出發",
    requirements: buildRequirements("【機票】台灣台中機場⇋金門尚義機場（單程 或 來回機票）"),
    regularTitle: "一般票券",
    regularPrice: 1,
    urgentTitle: "急件處理",
    urgentPrice: 1,
  },
  {
    id: "mtl004",
    title: "金廈小三通票券-嘉義出發",
    summary: "請來電洽詢（實際票務依客服確認）",
    image: "https://images.unsplash.com/photo-1474302770737-173ee21bab63?auto=format&fit=crop&w=1200&q=80",
    departureLabel: "嘉義出發",
    requirements: buildRequirements("【機票】台灣嘉義機場⇋金門尚義機場（單程 或 來回機票）"),
    regularTitle: "一般票券",
    regularPrice: 1,
    urgentTitle: "急件處理",
    urgentPrice: 1,
  },
  {
    id: "mtl005",
    title: "金廈小三通票券-台南出發",
    summary: "請來電洽詢（實際票務依客服確認）",
    image: "https://images.unsplash.com/photo-1474302770737-173ee21bab63?auto=format&fit=crop&w=1200&q=80",
    departureLabel: "台南出發",
    requirements: buildRequirements("【機票】台灣台南機場⇋金門尚義機場（單程 或 來回機票）"),
    regularTitle: "一般票券",
    regularPrice: 1,
    urgentTitle: "急件處理",
    urgentPrice: 1,
  },
];

export function getMiniTransitTicketById(id: string) {
  return MINI_TRANSIT_TICKET_ITEMS.find((item) => item.id === id);
}
