import type { StaticImageData } from "next/image";
import education from "../../../public/images/highlights/events/bitcoin-protocol-course-3-2026-05-17.jpg";
import community from "../../../public/images/what-we-do/community.jpg";
import exhibition from "../../../public/images/what-we-do/exhibition.jpeg";
import experience from "../../../public/images/what-we-do/experience.jpeg";
import gallery from "../../../public/images/what-we-do/gallery.jpeg";
import lounge from "../../../public/images/what-we-do/lounge.jpeg";
import retail from "../../../public/images/what-we-do/retail.jpeg";
import type { Locale } from "@/i18n/routing";

export type CenterMediaMetadata = {
  readonly image: StaticImageData;
  readonly alt: Readonly<Record<Locale, string>>;
  readonly focalPosition: {
    readonly landscape: string;
    readonly portrait: string;
  };
  readonly recommendedAspectRatio: {
    readonly landscape: string;
    readonly portrait: string;
  };
};

export const centerMedia = {
  lounge: {
    image: lounge,
    alt: {
      ko: "비트코인 도서·작품, 갈색 소파, 창가 좌석이 있는 센터 라운지",
      en: "Center lounge with Bitcoin books and art, a brown sofa and window seating",
    },
    focalPosition: { landscape: "62% 55%", portrait: "68% 54%" },
    recommendedAspectRatio: { landscape: "21 / 9", portrait: "4 / 3" },
  },
  community: {
    image: community,
    alt: {
      ko: "센터 홀에서 강의를 듣는 참가자들과 오른쪽의 발표자",
      en: "Participants attending a class in the center, with the presenter on the right",
    },
    focalPosition: { landscape: "56% 55%", portrait: "68% 55%" },
    recommendedAspectRatio: { landscape: "4 / 3", portrait: "4 / 5" },
  },
  education: {
    image: education,
    alt: {
      ko: "센터 홀에서 열린 비트코인 프로토콜 강의",
      en: "A Bitcoin protocol course in the center hall",
    },
    focalPosition: { landscape: "60% 54%", portrait: "67% 54%" },
    recommendedAspectRatio: { landscape: "4 / 3", portrait: "4 / 5" },
  },
  experience: {
    image: experience,
    alt: {
      ko: "흰색 거치대에 놓인 여러 하드웨어 지갑과 휴대전화",
      en: "Several hardware wallets and a phone displayed on white stands",
    },
    focalPosition: { landscape: "50% 48%", portrait: "50% 48%" },
    recommendedAspectRatio: { landscape: "1 / 1", portrait: "1 / 1" },
  },
  exhibition: {
    image: exhibition,
    alt: {
      ko: "비트코인 도서와 백서 포스터가 있는 서재",
      en: "Numbered shelves of Bitcoin books beside a whitepaper poster",
    },
    focalPosition: { landscape: "54% 50%", portrait: "53% 52%" },
    recommendedAspectRatio: { landscape: "3 / 2", portrait: "4 / 5" },
  },
  gallery: {
    image: gallery,
    alt: {
      ko: "센터 벽에 걸린 비트코인 관련 그림과 판화 세 점",
      en: "Three Bitcoin-related illustrations and prints on a wall at the center",
    },
    focalPosition: { landscape: "52% 50%", portrait: "56% 50%" },
    recommendedAspectRatio: { landscape: "16 / 9", portrait: "4 / 5" },
  },
  retail: {
    image: retail,
    alt: {
      ko: "비트코인 관련 소품과 도구가 놓인 센터의 흰색 선반",
      en: "White shelves at the center holding Bitcoin-related objects and tools",
    },
    focalPosition: { landscape: "50% 52%", portrait: "54% 52%" },
    recommendedAspectRatio: { landscape: "16 / 9", portrait: "4 / 3" },
  },
  retailDetail: {
    image: retail,
    alt: {
      ko: "센터 선반 위의 흰색 토끼 소품과 유리잔",
      en: "A white rabbit ornament and glasses on a center shelf",
    },
    focalPosition: { landscape: "75% 42%", portrait: "75% 42%" },
    recommendedAspectRatio: { landscape: "4 / 3", portrait: "4 / 3" },
  },
} as const satisfies Record<string, CenterMediaMetadata>;

export type CenterMediaKey = keyof typeof centerMedia;
