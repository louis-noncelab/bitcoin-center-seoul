import type { Locale } from "@/i18n/routing";
import type { CenterMediaKey } from "./media";

export const centerHours = { opens: "12:00", closes: "20:00" } as const;
export const centerSocialLinks = {
  x: "https://x.com/BtcCtrSeoul",
  instagram: "https://www.instagram.com/bitcoincenterseoul/",
} as const;

export function centerPostalAddress(locale: Locale) {
  return {
    "@type": "PostalAddress",
    streetAddress: locale === "ko" ? "신촌로2안길 30, 2층" : "2F, 30 Sinchon-ro 2an-gil",
    addressLocality: locale === "ko" ? "마포구" : "Mapo-gu",
    addressRegion: locale === "ko" ? "서울특별시" : "Seoul",
    postalCode: "04056",
    addressCountry: "KR",
  } as const;
}

type Link = {
  readonly label: string;
  readonly href: string;
};

export type CenterLocaleContent = {
  readonly nav: readonly (Link & { readonly id: string })[];
  readonly hero: {
    readonly eyebrow: string;
    readonly title: string;
    readonly introduction: string;
    readonly secondaryLink: Link;
  };
  readonly about: {
    readonly eyebrow: string;
    readonly title: string;
    readonly introduction: string;
    readonly galleryTitle: string;
    readonly spaces: readonly {
      readonly photo: CenterMediaKey;
      readonly title: string;
      readonly description: string;
    }[];
  };
  readonly programs: {
    readonly eyebrow: string;
    readonly title: string;
    readonly introduction: string;
    readonly description: string;
  };
  readonly experience: {
    readonly eyebrow: string;
    readonly title: string;
    readonly introduction: string;
    readonly areas: readonly {
      readonly id: "exhibition" | "wallet" | "boardgame";
      readonly title: string;
      readonly description: string;
    }[];
    readonly walletExperienceLink: Link;
    readonly boardGameLink: Link;
  };
  readonly journal: {
    readonly eyebrow: string;
    readonly title: string;
    readonly introduction: string;
  };
  readonly visit: {
    readonly eyebrow: string;
    readonly title: string;
    readonly introduction: string;
    readonly firstVisit: readonly { readonly question: string; readonly answer: string }[];
    readonly address: {
      readonly label: string;
      readonly value: string;
      readonly note: string;
    };
    readonly hours: {
      readonly label: string;
      readonly lines: readonly string[];
    };
    readonly contact: {
      readonly label: string;
      readonly email: Link;
      readonly phone: Link;
    };
    readonly website: Link;
    readonly mapLinks: readonly Link[];
    readonly mapEmbedSrc: string;
  };
};

export const centerContent = {
  ko: {
    nav: [
      { id: "home", label: "홈", href: "#home" },
      { id: "about", label: "센터 소개", href: "#about" },
      { id: "programs", label: "프로그램", href: "#programs" },
      { id: "journal", label: "현장 스케치", href: "#journal" },
      { id: "experience", label: "전시 및 체험", href: "#experience" },
      { id: "visit", label: "방문 안내", href: "#visit" },
    ],
    hero: {
      eyebrow: "BITCOIN CENTER SEOUL",
      title: "비트코인 센터 서울",
      introduction:
        "서울 마포구, 홍대입구역 가까이에 있는 비트코인 공간입니다 강의와 밋업에 참여하고, 도서와 작품을 둘러보고, 하드웨어 지갑을 체험할 수 있습니다",
      secondaryLink: { label: "프로그램 보기", href: "#programs" },
    },
    about: {
      eyebrow: "ABOUT",
      title: "비트코인 센터 서울",
      introduction:
        "비트코인을 읽고, 만나고, 직접 써 보는 서울의 문화 공간입니다 홍대입구역 근처에 라운지와 비트코인 서재, 작품 전시, 강의와 밋업이 열리는 홀을 갖추고 있습니다",
      galleryTitle: "센터의 공간",
      spaces: [
        { photo: "gallery", title: "작품", description: "비트코인을 주제로 한 그림과 판화입니다" },
        { photo: "retail", title: "굿즈", description: "비트코인 굿즈와 다양한 소품을 전시합니다" },
        { photo: "experience", title: "하드웨어 지갑 체험존", description: "테스트 비트코인으로 지갑을 체험합니다" },
        { photo: "exhibition", title: "서재", description: "비트코인 관련 도서를 비치했습니다" },
        { photo: "lounge", title: "라운지", description: "창가 좌석과 소파가 있는 휴식 공간입니다" },
        { photo: "community", title: "홀", description: "비트코인 강의와 밋업이 열리는 공간입니다" },
      ],
    },
    programs: {
      eyebrow: "PROGRAMS",
      title: "강의와 밋업",
      introduction:
        "비트코인 입문 강의, 개발자 밋업, 워크숍과 영화 모임을 엽니다 서울에서 열리는 행사와 온라인 모임의 날짜, 장소, 참가비와 신청 방법을 확인할 수 있습니다",
      description:
        "비트코인 입문, 백서와 프로토콜, 셀프 커스터디, 개발 강의를 엽니다 개발자 밋업과 월간 모임, 영화 상영도 함께 진행합니다",
    },
    experience: {
      eyebrow: "EXPERIENCE",
      title: "전시와 체험",
      introduction:
        "비트코인 도서와 작품을 둘러보고, 테스트 비트코인으로 하드웨어 지갑을 체험합니다 센터에 비치된 보드게임도 즐길 수 있습니다",
      areas: [
        {
          id: "exhibition",
          title: "도서와 작품",
          description:
            "비트코인 백서와 관련 도서, 비트코인을 주제로 한 작품을 전시합니다",
        },
        {
          id: "boardgame",
          title: "보드게임",
          description:
            "센터에 비치된 보드게임을 즐길 수 있습니다",
        },
        {
          id: "wallet",
          title: "하드웨어 지갑 체험",
          description:
            "체험존에 여러 하드웨어 지갑과 테스트용 안내가 있습니다",
        },
      ],
      walletExperienceLink: {
        label: "지갑 체험 가이드",
        href: "/experience/wallet",
      },
      boardGameLink: {
        label: "보드게임 둘러보기",
        href: "/experience/board-game",
      },
    },
    journal: {
      eyebrow: "HIGHLIGHTS",
      title: "현장 스케치",
      introduction:
        "서울에서 열린 비트코인 강의와 개발자 밋업, 워크숍과 모임을 사진과 글로 기록합니다 지난 행사의 모습과 사람들이 나눈 이야기를 살펴보세요",
    },
    visit: {
      eyebrow: "VISIT",
      title: "비트코인 센터 서울 방문 안내",
      introduction:
        "서울 마포구 신촌로2안길 30, 2층에 있습니다 홍대입구역 6번 출구에서 도보 3분입니다 운영시간, 입장료와 예약 안내를 확인하세요 대관 중에는 공간을 이용할 수 없습니다",
      firstVisit: [
        { question: "예약이 필요한가요?", answer: "일반 방문은 예약 없이 오시면 됩니다 강의 및 밋업 참여는 행사별 안내를 확인해주세요" },
        { question: "입장료가 있나요?", answer: "입장료는 3,000 sats입니다" },
        { question: "지갑 체험은 언제 할 수 있나요?", answer: "입장 후 언제든 하드웨어 지갑 체험존을 이용할 수 있습니다" },
      ],
      address: {
        label: "주소",
        value: "서울시 마포구 신촌로2안길 30 2층",
        note: "홍대입구역 6번 출구에서 도보 3분",
      },
      hours: {
        label: "운영시간",
        lines: [`${centerHours.opens} ~ ${centerHours.closes}`, "매일 운영 (법정 공휴일 휴무)", "대관 중 이용 불가"],
      },
      contact: {
        label: "문의",
        email: { label: "hello@noncelab.com", href: "mailto:hello@noncelab.com" },
        phone: { label: "+82-2-702-1718", href: "tel:+8227021718" },
      },
      website: {
        label: "기존 웹사이트",
        href: "https://bitcoincenterseoul.com",
      },
      mapLinks: [
        { label: "Google 지도", href: "https://maps.app.goo.gl/n143j19LYrx3g8UF6" },
      ],
      mapEmbedSrc: "https://www.google.com/maps/embed?pb=!1m5!3m3!1m2!1s0x357c99003a4d24f1%3A0xf0edd07ed772afe8!2z67mE7Yq47L2U7J24IOyEvO2EsCDshJzsmrggYml0Y29pbiBjZW50ZXIgc2VvdWw!5e0!3m2!1sko!2skr!4v1789005787721!5m2!1sko!2skr",
    },
  },
  en: {
    nav: [
      { id: "home", label: "Home", href: "#home" },
      { id: "about", label: "About", href: "#about" },
      { id: "programs", label: "Programs", href: "#programs" },
      { id: "journal", label: "Highlights", href: "#journal" },
      { id: "experience", label: "Exhibition & Experience", href: "#experience" },
      { id: "visit", label: "Visit", href: "#visit" },
    ],
    hero: {
      eyebrow: "BITCOIN CENTER SEOUL",
      title: "Bitcoin Center Seoul",
      introduction:
        "A Bitcoin community space in Hongdae, Mapo, Seoul Join classes and meetups, browse Bitcoin books and art, and try hardware wallets with test bitcoin",
      secondaryLink: { label: "View programs", href: "#programs" },
    },
    about: {
      eyebrow: "ABOUT",
      title: "Bitcoin Center Seoul",
      introduction:
        "Explore Bitcoin culture in Seoul, near Hongik University Station The center has a lounge, a Bitcoin library, art displays, a hardware wallet demo area and a hall for classes and meetups",
      galleryTitle: "Spaces at the center",
      spaces: [
        { photo: "gallery", title: "Art", description: "Discover paintings and prints inspired by Bitcoin" },
        { photo: "retail", title: "Merchandise", description: "Browse Bitcoin merchandise and a variety of small objects" },
        { photo: "experience", title: "Hardware wallet area", description: "Try hardware wallets using test bitcoin" },
        { photo: "exhibition", title: "Library", description: "Browse books about Bitcoin" },
        { photo: "lounge", title: "Lounge", description: "Relax and share a conversation on the sofa or by the windows" },
        { photo: "community", title: "Hall", description: "The hall hosts Bitcoin classes, meetups and community gatherings" },
      ],
    },
    programs: {
      eyebrow: "PROGRAMS",
      title: "Classes and meetups",
      introduction:
        "Find Bitcoin classes, developer meetups, workshops and film gatherings in Seoul, along with online events Each listing has the date, venue, fee and registration details",
      description:
        "Classes cover Bitcoin fundamentals, the whitepaper and protocol, self-custody and development The center also hosts developer meetups, monthly gatherings and film screenings",
    },
    experience: {
      eyebrow: "EXPERIENCE",
      title: "Exhibitions and experiences",
      introduction:
        "Browse Bitcoin books and art, try hardware wallets with test bitcoin, and play the board games kept at Bitcoin Center Seoul",
      areas: [
        {
          id: "exhibition",
          title: "Books and art",
          description:
            "Bitcoin books, a whitepaper display and Bitcoin-themed art",
        },
        {
          id: "boardgame",
          title: "Board games",
          description:
            "Board games are kept at the center",
        },
        {
          id: "wallet",
          title: "Hardware wallet experience",
          description:
            "The demo area has several hardware wallets and instructions for testing them",
        },
      ],
      walletExperienceLink: {
        label: "Wallet experience guide",
        href: "/experience/wallet",
      },
      boardGameLink: {
        label: "Browse board games",
        href: "/experience/board-game",
      },
    },
    journal: {
      eyebrow: "HIGHLIGHTS",
      title: "Highlights",
      introduction: "Photos and stories from Bitcoin classes, developer meetups, workshops and community gatherings in Seoul See what happened at past events",
    },
    visit: {
      eyebrow: "VISIT",
      title: "Visit Bitcoin Center Seoul",
      introduction:
        "Find opening hours, admission and directions to Bitcoin Center Seoul at 2F, 30 Sinchon-ro 2an-gil, Mapo-gu It is a three-minute walk from Hongik University Station Exit 6 Unavailable during private rentals",
      firstVisit: [
        { question: "Do I need a reservation?", answer: "No reservation is needed for a regular visit For classes and meetups, check the individual event details" },
        { question: "Is there an admission fee?", answer: "Admission is 3,000 sats" },
        { question: "When can I try the wallets?", answer: "You can use the hardware wallet demo area at any time after admission" },
      ],
      address: {
        label: "Address",
        value: "30, Sinchon-ro 2an\u2011gil, Mapo-gu, Seoul, 2F",
        note: "3-minute walk from Hongik University Station Exit 6",
      },
      hours: {
        label: "Hours",
        lines: [`${centerHours.opens} - ${centerHours.closes}`, "Open daily, except public holidays", "Unavailable during private rentals"],
      },
      contact: {
        label: "Contact",
        email: { label: "hello@noncelab.com", href: "mailto:hello@noncelab.com" },
        phone: { label: "+82-2-702-1718", href: "tel:+8227021718" },
      },
      website: {
        label: "Original website",
        href: "https://bitcoincenterseoul.com",
      },
      mapLinks: [
        { label: "Google Maps", href: "https://maps.app.goo.gl/n143j19LYrx3g8UF6" },
      ],
      mapEmbedSrc: "https://www.google.com/maps/embed?pb=!1m5!3m3!1m2!1s0x357c99003a4d24f1%3A0xf0edd07ed772afe8!2z67mE7Yq47L2U7J24IOyEvO2EsCDshJzsmrggYml0Y29pbiBjZW50ZXIgc2VvdWw!5e0!3m2!1sen!2skr!4v1789005788876!5m2!1sen!2skr",
    },
  },
} as const satisfies Record<Locale, CenterLocaleContent>;
