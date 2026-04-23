"use client";

import { useEffect, useRef } from "react";

type Destination = {
  title: string;
  subtitle: string;
  image: string;
};

type RouteSection = {
  id: string;
  categoryLabel: string;
  title: string;
  description: string;
  destinations: Destination[];
};

const lineHref = "https://line.me/ti/p/YOUR_LINE_ID";

const sections: RouteSection[] = [
  {
    id: "japan",
    categoryLabel: "日本",
    title: "日本旅遊",
    description: "東京、大阪到北海道，快速瀏覽熱門日本城市與度假路線。",
    destinations: [
      {
        title: "東京",
        subtitle: "都會購物 / 美食散策",
        image:
          "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?auto=format&fit=crop&w=1200&q=80",
      },
      {
        title: "大阪",
        subtitle: "關西人氣 / 樂園行程",
        image:
          "https://images.unsplash.com/photo-1590559899731-a382839e5549?auto=format&fit=crop&w=1200&q=80",
      },
      {
        title: "北海道",
        subtitle: "雪景溫泉 / 四季自然",
        image:
          "https://images.unsplash.com/photo-1513407030348-c983a97b98d8?auto=format&fit=crop&w=1200&q=80",
      },
      {
        title: "沖繩",
        subtitle: "海島度假 / 親子首選",
        image:
          "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80",
      },
      {
        title: "九州",
        subtitle: "溫泉鐵道 / 深度慢旅",
        image:
          "https://images.unsplash.com/photo-1528164344705-47542687000d?auto=format&fit=crop&w=1200&q=80",
      },
    ],
  },
  {
    id: "korea",
    categoryLabel: "韓國",
    title: "韓國旅遊",
    description: "適合短天數出遊，從城市購物到海岸景點都能快速安排。",
    destinations: [
      {
        title: "首爾",
        subtitle: "潮流購物 / 韓劇景點",
        image:
          "https://images.unsplash.com/photo-1549693578-d683be217e58?auto=format&fit=crop&w=1200&q=80",
      },
      {
        title: "釜山",
        subtitle: "海景咖啡 / 美食市場",
        image:
          "https://images.unsplash.com/photo-1570168007204-dfb528c6958f?auto=format&fit=crop&w=1200&q=80",
      },
      {
        title: "濟州",
        subtitle: "自然療癒 / 海岸風光",
        image:
          "https://images.unsplash.com/photo-1528127269322-539801943592?auto=format&fit=crop&w=1200&q=80",
      },
    ],
  },
  {
    id: "china",
    categoryLabel: "中港澳旅遊",
    title: "中港澳旅遊",
    description: "城市探索・自然奇景・經典熱門路線",
    destinations: [
      {
        title: "上海",
        subtitle: "都會購物與夜景",
        image:
          "https://images.unsplash.com/photo-1548919973-5cef591cdbc9?q=80&w=1200&auto=format&fit=crop",
      },
      {
        title: "北京",
        subtitle: "歷史文化與古蹟",
        image:
          "https://images.unsplash.com/photo-1508804185872-d7badad00f7d?auto=format&fit=crop&w=1200&q=80",
      },
      {
        title: "張家界",
        subtitle: "山水奇景人氣爆款",
        image:
          "https://images.unsplash.com/photo-1528127269322-539801943592?auto=format&fit=crop&w=1200&q=80",
      },
      {
        title: "九寨溝",
        subtitle: "夢幻湖景",
        image:
          "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80",
      },
      {
        title: "香港",
        subtitle: "購物美食短天數首選",
        image:
          "https://images.unsplash.com/photo-1506970845246-18f21d533b20?auto=format&fit=crop&w=1200&q=80",
      },
      {
        title: "澳門",
        subtitle: "渡假娛樂與美食",
        image:
          "https://images.unsplash.com/photo-1516483638261-f4dbaf036963?auto=format&fit=crop&w=1200&q=80",
      },
    ],
  },
  {
    id: "sea",
    categoryLabel: "東南亞",
    title: "東南亞旅遊",
    description: "輕鬆度假與高性價比首選，熱門海島與城市一次掌握。",
    destinations: [
      {
        title: "曼谷",
        subtitle: "夜市購物 / 寺廟文化",
        image:
          "https://images.unsplash.com/photo-1508009603885-50cf7c579365?auto=format&fit=crop&w=1200&q=80",
      },
      {
        title: "新加坡",
        subtitle: "城市花園 / 親子旅遊",
        image:
          "https://images.unsplash.com/photo-1525625293386-3f8f99389edd?auto=format&fit=crop&w=1200&q=80",
      },
      {
        title: "峇里島",
        subtitle: "Villa 度假 / 浪漫放鬆",
        image:
          "https://images.unsplash.com/photo-1537953773345-d172ccf13cf1?auto=format&fit=crop&w=1200&q=80",
      },
      {
        title: "峴港",
        subtitle: "海濱假期 / 中越景點",
        image:
          "https://images.unsplash.com/photo-1528127269322-539801943592?auto=format&fit=crop&w=1200&q=80",
      },
      {
        title: "富國島",
        subtitle: "海島慢旅 / 放空首選",
        image:
          "https://images.unsplash.com/photo-1500375592092-40eb2168fd21?auto=format&fit=crop&w=1200&q=80",
      },
    ],
  },
  {
    id: "europe",
    categoryLabel: "歐洲",
    title: "歐洲旅遊",
    description: "經典藝術、人文與自然景色並行，適合深度旅行規劃。",
    destinations: [
      {
        title: "巴黎",
        subtitle: "浪漫城市 / 精品藝術",
        image:
          "https://images.unsplash.com/photo-1499856871958-5b9627545d1a?auto=format&fit=crop&w=1200&q=80",
      },
      {
        title: "羅馬",
        subtitle: "歷史古城 / 義式風情",
        image:
          "https://images.unsplash.com/photo-1525874684015-58379d421a52?auto=format&fit=crop&w=1200&q=80",
      },
      {
        title: "瑞士",
        subtitle: "雪山湖景 / 火車旅行",
        image:
          "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=1200&q=80",
      },
      {
        title: "倫敦",
        subtitle: "英倫城市 / 博物館漫遊",
        image:
          "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?auto=format&fit=crop&w=1200&q=80",
      },
      {
        title: "布拉格",
        subtitle: "童話古城 / 河岸夜景",
        image:
          "https://images.unsplash.com/photo-1519677100203-a0e668c92439?auto=format&fit=crop&w=1200&q=80",
      },
    ],
  },
  {
    id: "usa",
    categoryLabel: "美國加拿大",
    title: "美國加拿大",
    description: "城市地標、自然景觀與度假海島，適合多元組合式行程。",
    destinations: [
      {
        title: "紐約",
        subtitle: "經典地標 / 百老匯",
        image:
          "https://images.unsplash.com/photo-1499092346589-b9b6be3e94b2?auto=format&fit=crop&w=1200&q=80",
      },
      {
        title: "洛杉磯",
        subtitle: "影城景點 / 海岸公路",
        image:
          "https://images.unsplash.com/photo-1534196511436-921a4e99f297?auto=format&fit=crop&w=1200&q=80",
      },
      {
        title: "夏威夷",
        subtitle: "海島假期 / 悠閒度假",
        image:
          "https://images.unsplash.com/photo-1505881502353-a1986add3762?auto=format&fit=crop&w=1200&q=80",
      },
      {
        title: "溫哥華",
        subtitle: "城市自然 / 輕奢慢旅",
        image:
          "https://images.unsplash.com/photo-1503614472-8c93d56e92ce?auto=format&fit=crop&w=1200&q=80",
      },
    ],
  },
  {
    id: "aus",
    categoryLabel: "澳洲紐西蘭",
    title: "澳洲紐西蘭",
    description: "適合自然景色與城市假期並重的中長天數旅行。",
    destinations: [
      {
        title: "雪梨",
        subtitle: "海港城市 / 地標建築",
        image:
          "https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?auto=format&fit=crop&w=1200&q=80",
      },
      {
        title: "墨爾本",
        subtitle: "藝術街區 / 大洋路",
        image:
          "https://images.unsplash.com/photo-1514395462725-fb4566210144?auto=format&fit=crop&w=1200&q=80",
      },
      {
        title: "皇后鎮",
        subtitle: "湖畔山景 / 蜜月精選",
        image:
          "https://images.unsplash.com/photo-1502780402662-acc019177b56?auto=format&fit=crop&w=1200&q=80",
      },
    ],
  },
  {
    id: "middle",
    categoryLabel: "中東非洲",
    title: "中東非洲",
    description: "異國文化與沙漠古文明，適合特色主題旅行。",
    destinations: [
      {
        title: "杜拜",
        subtitle: "奢華城市 / 沙漠體驗",
        image:
          "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=1200&q=80",
      },
      {
        title: "土耳其",
        subtitle: "熱氣球 / 東西文化",
        image:
          "https://images.unsplash.com/photo-1541432901042-2d8bd64b4a9b?auto=format&fit=crop&w=1200&q=80",
      },
      {
        title: "埃及",
        subtitle: "金字塔 / 尼羅河風情",
        image:
          "https://images.unsplash.com/photo-1539768942893-daf53e448371?auto=format&fit=crop&w=1200&q=80",
      },
    ],
  },
  {
    id: "cruise",
    categoryLabel: "郵輪旅遊",
    title: "郵輪旅遊",
    description: "精選熱門郵輪航線，從台灣短線到歐洲經典路線一次掌握。",
    destinations: [
      {
        title: "沖繩",
        subtitle: "台灣出發短線首選",
        image:
          "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80",
      },
      {
        title: "石垣島",
        subtitle: "跳島人氣航點",
        image:
          "https://images.unsplash.com/photo-1519046904884-53103b34b206?auto=format&fit=crop&w=1200&q=80",
      },
      {
        title: "宮古島",
        subtitle: "海島度假輕鬆玩",
        image:
          "https://images.unsplash.com/photo-1493558103817-58b2924bce98?auto=format&fit=crop&w=1200&q=80",
      },
      {
        title: "九州／日韓雙國",
        subtitle: "一次玩兩地",
        image:
          "https://images.unsplash.com/photo-1528164344705-47542687000d?auto=format&fit=crop&w=1200&q=80",
      },
      {
        title: "地中海",
        subtitle: "歐洲人氣郵輪航線",
        image:
          "https://images.unsplash.com/photo-1500375592092-40eb2168fd21?auto=format&fit=crop&w=1200&q=80",
      },
    ],
  },
  {
    id: "luxury",
    categoryLabel: "奢華旅遊",
    title: "奢華旅遊",
    description: "高端住宿、商務艙與私人訂製服務靈感，適合追求品質與體驗的旅客。",
    destinations: [
      {
        title: "巴黎",
        subtitle: "經典高端歐洲之旅",
        image:
          "https://images.unsplash.com/photo-1499856871958-5b9627545d1a?auto=format&fit=crop&w=1200&q=80",
      },
      {
        title: "瑞士",
        subtitle: "雪山景觀與奢華飯店",
        image:
          "https://images.unsplash.com/photo-1521295121783-8a321d551ad2?auto=format&fit=crop&w=1200&q=80",
      },
      {
        title: "杜拜",
        subtitle: "都市奢華與頂級享受",
        image:
          "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=1200&q=80",
      },
      {
        title: "馬爾地夫",
        subtitle: "頂級度假與私人島嶼",
        image:
          "https://images.unsplash.com/photo-1573843981267-be1999ff37cd?auto=format&fit=crop&w=1200&q=80",
      },
      {
        title: "義大利",
        subtitle: "精品文化與高端旅行",
        image:
          "https://images.unsplash.com/photo-1525874684015-58379d421a52?auto=format&fit=crop&w=1200&q=80",
      },
    ],
  },
  {
    id: "honeymoon",
    categoryLabel: "蜜月旅遊",
    title: "蜜月旅遊",
    description: "精選浪漫海島與蜜月度假靈感，適合情侶、夫妻與新婚旅行規劃。",
    destinations: [
      {
        title: "馬爾地夫",
        subtitle: "奢華水上屋蜜月首選",
        image:
          "https://images.unsplash.com/photo-1573843981267-be1999ff37cd?auto=format&fit=crop&w=1200&q=80",
      },
      {
        title: "薄荷島",
        subtitle: "悠閒海景與雙人度假",
        image:
          "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80",
      },
      {
        title: "峇里島",
        subtitle: "浪漫海島與Villa體驗",
        image:
          "https://images.unsplash.com/photo-1537953773345-d172ccf13cf1?auto=format&fit=crop&w=1200&q=80",
      },
      {
        title: "長灘島",
        subtitle: "白沙灘蜜月人氣航點",
        image:
          "https://images.unsplash.com/photo-1500375592092-40eb2168fd21?auto=format&fit=crop&w=1200&q=80",
      },
      {
        title: "普吉島",
        subtitle: "海景放鬆與雙人小旅行",
        image:
          "https://images.unsplash.com/photo-1468413253725-0d5181091126?auto=format&fit=crop&w=1200&q=80",
      },
    ],
  },
  {
    id: "free",
    categoryLabel: "自由行",
    title: "自由行",
    description: "機加酒、交通票券與彈性路線建議，適合喜歡自主安排的旅客。",
    destinations: [
      {
        title: "東京",
        subtitle: "都會購物與自由行首選",
        image:
          "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?auto=format&fit=crop&w=1200&q=80",
      },
      {
        title: "大阪",
        subtitle: "美食購物人氣城市",
        image:
          "https://images.unsplash.com/photo-1590559899731-a382839e5549?auto=format&fit=crop&w=1200&q=80",
      },
      {
        title: "首爾",
        subtitle: "短天數自由行熱門",
        image:
          "https://images.unsplash.com/photo-1549693578-d683be217e58?auto=format&fit=crop&w=1200&q=80",
      },
      {
        title: "曼谷",
        subtitle: "高CP值自由行",
        image:
          "https://images.unsplash.com/photo-1508009603885-50cf7c579365?auto=format&fit=crop&w=1200&q=80",
      },
      {
        title: "新加坡",
        subtitle: "親子與城市輕旅行",
        image:
          "https://images.unsplash.com/photo-1525625293386-3f8f99389edd?auto=format&fit=crop&w=1200&q=80",
      },
      {
        title: "香港",
        subtitle: "近程快閃自由行",
        image:
          "https://images.unsplash.com/photo-1506970845246-18f21d533b20?auto=format&fit=crop&w=1200&q=80",
      },
    ],
  },
  {
    id: "custom",
    categoryLabel: "客製旅遊",
    title: "客製旅遊",
    description: "依照你的同行對象與旅行目的，安排最適合的客製化玩法。",
    destinations: [
      {
        title: "家庭旅遊",
        subtitle: "親子友善 / 輕鬆安排",
        image:
          "https://images.unsplash.com/photo-1511895426328-dc8714191300?auto=format&fit=crop&w=1200&q=80",
      },
      {
        title: "蜜月旅遊",
        subtitle: "浪漫假期 / 精緻住宿",
        image:
          "https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?auto=format&fit=crop&w=1200&q=80",
      },
      {
        title: "公司旅遊",
        subtitle: "團體安排 / 行程效率",
        image:
          "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=1200&q=80",
      },
      {
        title: "小團包車",
        subtitle: "彈性路線 / 專人帶玩",
        image:
          "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=1200&q=80",
      },
    ],
  },
];

function RouteRow({
  section,
}: {
  section: RouteSection;
}) {
  const hasDestinations = section.destinations.length > 0;
  const rowRef = useRef<HTMLDivElement | null>(null);
  const frameRef = useRef<number | null>(null);
  const setupFrameRef = useRef<number | null>(null);
  const pauseTimeoutRef = useRef<number | null>(null);
  const pauseUntilRef = useRef(0);
  const loopedDestinations = [...section.destinations, ...section.destinations, ...section.destinations];

  useEffect(() => {
    const element = rowRef.current;

    if (!element || !hasDestinations) {
      return;
    }

    const setInitialPosition = () => {
      const segmentWidth = element.scrollWidth / 3;

      if (segmentWidth > 0 && element.scrollWidth > element.clientWidth) {
        element.scrollLeft = segmentWidth;
        return true;
      }

      return false;
    };

    const normalizeScrollPosition = () => {
      const segmentWidth = element.scrollWidth / 3;

      if (segmentWidth <= 0) {
        return;
      }

      if (element.scrollLeft >= segmentWidth * 2) {
        element.scrollLeft -= segmentWidth;
      } else if (element.scrollLeft <= 0) {
        element.scrollLeft += segmentWidth;
      }
    };

    const tick = () => {
      if (!element) {
        return;
      }

      normalizeScrollPosition();

      if (Date.now() >= pauseUntilRef.current) {
        element.scrollLeft += 0.45;
      }

      frameRef.current = window.requestAnimationFrame(tick);
    };

    const initialize = () => {
      if (!element) {
        return;
      }

      const ready = setInitialPosition();

      if (ready) {
        frameRef.current = window.requestAnimationFrame(tick);
        return;
      }

      setupFrameRef.current = window.requestAnimationFrame(initialize);
    };

    setupFrameRef.current = window.requestAnimationFrame(initialize);

    return () => {
      if (pauseTimeoutRef.current !== null) {
        window.clearTimeout(pauseTimeoutRef.current);
      }

      if (setupFrameRef.current !== null) {
        window.cancelAnimationFrame(setupFrameRef.current);
      }

      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current);
      }
    };
  }, [hasDestinations, loopedDestinations.length]);

  const pauseAutoScroll = () => {
    pauseUntilRef.current = Date.now() + 3000;

    if (pauseTimeoutRef.current !== null) {
      window.clearTimeout(pauseTimeoutRef.current);
    }

    pauseTimeoutRef.current = window.setTimeout(() => {
      pauseUntilRef.current = 0;
      pauseTimeoutRef.current = null;
    }, 3000);
  };

  const scroll = (direction: number) => {
    const element = rowRef.current;

    if (!element) {
      return;
    }

    pauseAutoScroll();

    const segmentWidth = element.scrollWidth / 3;
    const firstCard = element.querySelector("[data-destination-card='true']") as HTMLAnchorElement | null;
    const gapValue = window.getComputedStyle(element).columnGap || window.getComputedStyle(element).gap;
    const gap = Number.parseFloat(gapValue || "0") || 0;
    const cardWidth = firstCard ? firstCard.offsetWidth + gap : 320;

    if (element.scrollLeft >= segmentWidth * 2) {
      element.scrollLeft -= segmentWidth;
    }

    if (element.scrollLeft <= 0) {
      element.scrollLeft += segmentWidth;
    }

    element.scrollBy({ left: direction * cardWidth, behavior: "smooth" });
  };

  return (
    <section
      id={section.id}
      className="scroll-mt-20 rounded-[1.75rem] border border-white/10 bg-[rgba(20,20,30,0.6)] p-3 shadow-lg shadow-black/20 backdrop-blur-[12px] md:p-4 lg:p-5"
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white sm:text-2xl">
            {section.title}
          </h2>
          <p className="mt-1 text-sm leading-6 text-white/70 sm:text-base">
            {section.description}
          </p>
        </div>
      </div>

      {!hasDestinations ? (
        <div className="rounded-[1.5rem] border border-white/10 bg-[rgba(20,20,30,0.6)] px-5 py-6 text-sm leading-6 text-white/70 backdrop-blur-[12px]">
          {section.description}
        </div>
      ) : (
        <div className="relative">
          <button
            type="button"
            onClick={() => scroll(-1)}
            className="absolute left-0 top-1/2 z-20 inline-flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-[rgba(20,20,30,0.7)] text-xl font-bold text-white shadow-lg shadow-black/30 transition hover:bg-[rgba(35,35,50,0.85)] sm:-left-3 lg:-left-4"
          >
            ‹
          </button>

          <div
            ref={rowRef}
            className="flex gap-4 overflow-x-auto px-10 pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:px-12"
          >
            {loopedDestinations.map((destination, destinationIndex) => (
              <a
                key={`${section.title}-${destination.title}-${destinationIndex}`}
                data-destination-card="true"
                href={lineHref}
                target="_blank"
                rel="noreferrer"
                className="group relative h-[144px] min-w-[280px] overflow-hidden rounded-[1.5rem] border border-white/10 bg-[rgba(20,20,30,0.45)] shadow-lg shadow-black/20 transition duration-300 hover:-translate-y-1 hover:shadow-xl md:h-[168px] md:min-w-[320px] lg:min-w-[340px]"
              >
                <div
                  className="absolute inset-0 bg-cover bg-center transition duration-500 group-hover:scale-105"
                  style={{ backgroundImage: `url(${destination.image})` }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-3 text-white md:p-4">
                  <h3 className="text-xl font-semibold sm:text-2xl">{destination.title}</h3>
                  <p className="mt-1 text-sm text-white/85">{destination.subtitle}</p>
                </div>
              </a>
            ))}
          </div>

          <button
            type="button"
            onClick={() => scroll(1)}
            className="absolute right-0 top-1/2 z-20 inline-flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-[rgba(20,20,30,0.7)] text-xl font-bold text-white shadow-lg shadow-black/30 transition hover:bg-[rgba(35,35,50,0.85)] sm:-right-3 lg:-right-4"
          >
            ›
          </button>
        </div>
      )}
    </section>
  );
}

export default function HomePage() {
  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);

    if (!element) {
      return;
    }

    element.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <main className="min-h-screen bg-[linear-gradient(135deg,#0b0f2a_0%,#0a0a0a_50%,#1a0d0d_100%)] text-white">
      <div className="sticky top-0 z-50 border-b border-white/10 bg-[rgba(20,20,30,0.72)] backdrop-blur-[12px]">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-4 px-4 py-2.5 md:px-6">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-300 sm:text-sm">
              Route Browser
            </p>
            <p className="mt-0.5 text-sm font-semibold text-white sm:text-base">
              快速瀏覽熱門旅遊目的地
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <p className="hidden text-[11px] font-medium text-white/70 sm:block sm:text-sm">
              旅遊規劃師 蓋瑞 GARY｜LINE 詢問行程
            </p>
            <a
              href={lineHref}
              target="_blank"
              rel="noreferrer"
              className="shrink-0 rounded-full bg-[#06C755] px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-[#05b64d] sm:px-5 sm:text-sm"
            >
              LINE 諮詢
            </a>
          </div>
        </div>
      </div>

      <section id="routes" className="mx-auto max-w-[1800px] px-2 py-6 md:px-3">
        <div className="mb-3 overflow-x-auto rounded-xl border border-white/10 bg-[rgba(20,20,30,0.6)] p-2 shadow-lg shadow-black/20 backdrop-blur-[12px] [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:px-3">
          <div className="flex min-w-max gap-3 md:min-w-0 md:flex-wrap">
            {sections.map((section) => (
              <button
                key={section.id}
                type="button"
                onClick={() => scrollToSection(section.id)}
                className="cursor-pointer rounded-full border border-white/10 bg-[rgba(255,255,255,0.08)] px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-[rgba(255,255,255,0.14)] hover:shadow"
              >
                {section.categoryLabel}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          {sections.map((section) => (
            <RouteRow key={section.title} section={section} />
          ))}
        </div>
      </section>
    </main>
  );
}
