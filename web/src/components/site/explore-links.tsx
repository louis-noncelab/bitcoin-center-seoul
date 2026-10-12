import { ArrowRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import "@/styles/explore-links.css";

const topics = {
  programs: {
    href: "/programs",
    ko: { title: "비트코인 강의와 밋업", description: "입문 강의부터 개발자 모임까지, 날짜와 참가 안내를 확인합니다." },
    en: { title: "Bitcoin classes and meetups", description: "Find dates and registration details for introductory classes and developer gatherings." },
  },
  wallet: {
    href: "/experience/wallet",
    ko: { title: "하드웨어 지갑 체험", description: "테스트 비트코인을 주고받으며 지갑 사용법을 익힙니다." },
    en: { title: "Try a hardware wallet", description: "Learn to send and receive test bitcoin with the wallet experience guide." },
  },
  collection: {
    href: "/collection",
    ko: { title: "비트코인 도서와 작품", description: "센터 서재의 책과 비트코인을 주제로 한 그림, 판화를 둘러봅니다." },
    en: { title: "Bitcoin books and art", description: "Browse the center's library, paintings and prints inspired by Bitcoin." },
  },
  boardgame: {
    href: "/experience/board-game",
    ko: { title: "센터의 보드게임", description: "센터에 비치된 보드게임과 게임별 소개를 살펴봅니다." },
    en: { title: "Board games at the center", description: "See the games available at the center and read about each one." },
  },
  visit: {
    href: "/visit",
    ko: { title: "홍대입구에서 센터까지", description: "역에서 오는 길, 운영시간, 입장료와 예약 안내를 확인합니다." },
    en: { title: "Plan your visit to Hongdae", description: "Find directions from Hongik University Station, opening hours and admission details." },
  },
  journal: {
    href: "/journal",
    ko: { title: "지난 밋업과 행사 이야기", description: "강의와 워크숍, 함께 모였던 날을 사진과 글로 돌아봅니다." },
    en: { title: "Stories from past meetups", description: "See photos and reports from classes, workshops and community gatherings." },
  },
  reviews: {
    href: "/reviews",
    ko: { title: "다녀간 사람들의 방문 후기", description: "처음 온 사람들에게 센터가 어떤 공간이었는지 읽어봅니다." },
    en: { title: "Stories from visitors", description: "Read what people wrote about their first visit to Bitcoin Center Seoul." },
  },
} as const;

const connections = {
  about: ["programs", "wallet", "visit"],
  programs: ["journal", "reviews", "visit"],
  experience: ["programs", "reviews", "visit"],
  journal: ["programs", "collection", "visit"],
  visit: ["programs", "wallet", "collection"],
  wallet: ["programs", "boardgame", "visit"],
  event: ["journal", "wallet", "visit"],
  story: ["programs", "reviews", "visit"],
} as const satisfies Record<string, readonly (keyof typeof topics)[]>;

export function ExploreLinks({ locale, from }: { readonly locale: Locale; readonly from: keyof typeof connections }) {
  return (
    <nav className="explore-links" aria-labelledby={`explore-${from}`}>
      <h2 id={`explore-${from}`}>{locale === "ko" ? "센터에서 더 살펴보기" : "Explore more at the center"}</h2>
      <ul>
        {connections[from].map((key) => {
          const topic = topics[key];
          return <li key={key}><Link href={topic.href} locale={locale}>
            <span className="explore-links-title">{topic[locale].title}<ArrowRight className="icon" aria-hidden="true" /></span>
            <span className="explore-links-description">{topic[locale].description}</span>
          </Link></li>;
        })}
      </ul>
    </nav>
  );
}
