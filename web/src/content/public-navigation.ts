import type { Locale } from "@/i18n/routing";

export function publicNavigation(locale: Locale) {
  const ko = locale === "ko";
  const link = (href: string, korean: string, english: string) => ({
    href,
    label: ko ? korean : english,
  });
  return [
    {
      id: "programs",
      ...link("/programs", "행사", "Events"),
      children: [
        link("/programs", "행사 전체 보기", "All events"),
        link("/programs#events", "행사 일정", "Event calendar"),
      ],
    },
    {
      id: "experience",
      ...link("/experience", "공간과 체험", "Space & experiences"),
      children: [
        link("/experience", "공간과 체험 안내", "Explore experiences"),
        link("/about", "센터 소개", "About the center"),
        link("/about#space-tour", "공간 둘러보기", "Space tour"),
        link("/experience/wallet", "지갑 체험", "Wallet experience"),
      ],
    },
    {
      id: "collection",
      ...link("/collection", "컬렉션", "Collection"),
      children: [
        link("/collection", "컬렉션 전체 보기", "All collections"),
        link("/collection?kind=boardgame", "보드게임", "Board games"),
        link("/collection?kind=book", "도서", "Books"),
        link("/collection?kind=magazine", "매거진", "Magazines"),
        link("/collection?kind=artwork", "작품", "Artworks"),
      ],
    },
    {
      id: "goods",
      ...link("/goods", "굿즈", "Goods"),
      children: [link("/goods", "굿즈와 구매 안내", "Goods & purchasing")],
    },
    {
      id: "news",
      ...link("/news", "소식", "News"),
      children: [
        link("/news", "소식 전체 보기", "All news"),
        link("/notices", "공지사항", "Notices"),
        link("/journal", "현장 스케치", "Field stories"),
        link("/news?view=media", "사진과 영상", "Photos & videos"),
        link("/reviews", "방문 후기", "Visitor stories"),
      ],
    },
    {
      id: "visit",
      ...link("/visit", "방문 안내", "Visit"),
      children: [link("/visit", "방문 안내 전체 보기", "Plan your visit")],
    },
  ] as const;
}

export type PublicNavigationSection = ReturnType<
  typeof publicNavigation
>[number]["id"];
