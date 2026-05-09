export type DocumentServiceId = "roc0001" | "roc0002" | "tcc0001";

export type DocumentServiceItem = {
  id: DocumentServiceId;
  title: string;
  summary: string;
  image: string;
  requirements: string[];
};

export const DOCUMENT_SERVICE_ITEMS: DocumentServiceItem[] = [
  {
    id: "roc0001",
    title: "中華民國護照-十年效期 (代上傳收送)",
    summary: "需準備資料如下",
    image: "https://images.unsplash.com/photo-1521295121783-8a321d551ad2?auto=format&fit=crop&w=1200&q=80",
    requirements: [
      "身分證正本",
      "兩吋六個月內彩色白底大頭照 2 張",
      "未過期之舊護照",
      "初次辦護照請至戶政事務所作人別確認",
      "D式委任書(申請人在國內)或E式委任書(申請人在國外並附上在台親屬身分證影本)",
      "未滿 14 歲，請附上須附上戶口名簿或戶籍謄 本正本(最近3個月內)",
      "未滿 18 歲，請附上監護人之身分證正本若 監護人離婚請附上戶口名簿正本（或三個月 內戶謄正本紀事不可省略並刊載監護權）",
      "滿 14 歲需有台灣身分證",
      "若改名，請附上 3 個月內詳細全戶戶籍謄本正本，記事事項不可省略。",
      "急件需附上已開票(有票號)之訂位紀錄",
    ],
  },
  {
    id: "roc0002",
    title: "中華民國護照<孩童>(五年效期)",
    summary: "孩童護照五年效期代辦，協助文件準備與申辦流程。",
    image: "https://images.unsplash.com/photo-1577985043696-8bd54d2b938a?auto=format&fit=crop&w=1200&q=80",
    requirements: [
      "監護人與孩童身分證明文件",
      "兩吋六個月內白底彩色大頭照 2 張",
      "未過期舊護照（若有）",
      "初次辦理需先完成人別確認",
      "委任書（依申請人所在地使用 D 式或 E 式）",
    ],
  },
  {
    id: "tcc0001",
    title: "台胞證 卡片式",
    summary: "台胞證卡片式申辦代辦，協助檢核文件並安排送件。",
    image: "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?auto=format&fit=crop&w=1200&q=80",
    requirements: [
      "身分證影本",
      "兩吋六個月內白底彩色大頭照 1 張",
      "六個月以上效期護照正本",
      "未過期舊台胞證（若有）",
      "其他送件所需補充文件（依個案通知）",
    ],
  },
];

export function getDocumentServiceById(id: string) {
  return DOCUMENT_SERVICE_ITEMS.find((item) => item.id === id);
}
