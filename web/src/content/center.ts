import type { Locale } from "@/i18n/routing";

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
    readonly details: readonly string[];
  };
  readonly programs: {
    readonly eyebrow: string;
    readonly title: string;
    readonly introduction: string;
    readonly categories: readonly {
      readonly id: "meetups" | "education";
      readonly title: string;
      readonly description: string;
    }[];
  };
  readonly experience: {
    readonly eyebrow: string;
    readonly title: string;
    readonly introduction: string;
    readonly areas: readonly {
      readonly id: "exhibition" | "wallet";
      readonly title: string;
      readonly description: string;
    }[];
    readonly walletExperienceLink: Link;
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
      { id: "experience", label: "전시·체험", href: "#experience" },
      { id: "visit", label: "방문 안내", href: "#visit" },
    ],
    hero: {
      eyebrow: "BITCOIN CENTER SEOUL",
      title: "비트코인 센터 서울",
      introduction:
        "비트코인 강의와 밋업이 열리는 공간입니다. 도서·작품을 전시하고 하드웨어 지갑 체험존을 운영합니다.",
      secondaryLink: { label: "프로그램 보기", href: "#programs" },
    },
    about: {
      eyebrow: "ABOUT",
      title: "비트코인 센터 서울",
      introduction:
        "라운지와 비트코인 서재, 홀, 하드웨어 지갑 체험존이 있습니다.",
      details: [
        "라운지에서 비트코인 도서·작품을 볼\u00a0수\u00a0있습니다.",
        "홀에서는 강의와 밋업이 열립니다.",
        "하드웨어 지갑 체험존도 이용할\u00a0수\u00a0있습니다.",
      ],
    },
    programs: {
      eyebrow: "PROGRAMS",
      title: "강의와 밋업",
      introduction:
        "입문 강의부터 개발자 과정까지 운영합니다. 강의와 모임의 일정은 행사 공지에서 확인할\u00a0수\u00a0있습니다.",
      categories: [
        {
          id: "meetups",
          title: "밋업",
          description:
            "비트코인 개발자 밋업, 월간 모임, 영화 상영이 열립니다.",
        },
        {
          id: "education",
          title: "교육",
          description:
            "비트코인 입문, 백서와 프로토콜, 셀프 커스터디, 개발 강의를 엽니다.",
        },
      ],
    },
    experience: {
      eyebrow: "EXPERIENCE",
      title: "전시와 지갑 체험",
      introduction:
        "비트코인 도서·작품을 전시합니다. 체험존에서는 하드웨어 지갑을 사용해 볼\u00a0수\u00a0있습니다.",
      areas: [
        {
          id: "exhibition",
          title: "도서·작품",
          description:
            "비트코인 백서와 관련 도서, 비트코인을 주제로 한 작품을 전시합니다.",
        },
        {
          id: "wallet",
          title: "하드웨어 지갑 체험",
          description:
            "체험존에 여러 하드웨어 지갑과 테스트용 안내가 있습니다.",
        },
      ],
      walletExperienceLink: {
        label: "지갑 체험 가이드",
        href: "/experience/wallet",
      },
    },
    journal: {
      eyebrow: "HIGHLIGHTS",
      title: "현장 스케치",
      introduction:
        "센터에서 열린 강의와 밋업을 사진과 글로 소개합니다.",
    },
    visit: {
      eyebrow: "VISIT",
      title: "비트코인 센터 서울 방문 안내",
      introduction:
        "홍대입구역 6번 출구에서 걸어서 3분 거리입니다. 대관 중에는 공간을 이용할\u00a0수\u00a0없습니다.",
      address: {
        label: "주소",
        value: "서울시 마포구 신촌로2안길 30 2층",
        note: "홍대입구역 6번 출구에서 도보 3분",
      },
      hours: {
        label: "운영시간",
        lines: ["12:00 ~ 20:00", "매일 운영 (법정 공휴일 휴무)", "대관 중 이용 불가"],
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
        "The center hosts Bitcoin classes and meetups. Visitors can browse the books, see the artwork and try hardware wallets.",
      secondaryLink: { label: "View programs", href: "#programs" },
    },
    about: {
      eyebrow: "ABOUT",
      title: "Bitcoin Center Seoul",
      introduction:
        "The center has a lounge, a Bitcoin library, a hall and a hardware wallet area.",
      details: [
        "The lounge includes Bitcoin books and art.",
        "Classes and meetups take place in the hall.",
        "Hardware wallets are available to try in the demo area.",
      ],
    },
    programs: {
      eyebrow: "PROGRAMS",
      title: "Classes and meetups",
      introduction:
        "Courses cover Bitcoin basics and development. Check the event schedule for upcoming dates.",
      categories: [
        {
          id: "meetups",
          title: "Meetups",
          description:
            "The center holds developer meetups, monthly gatherings and film screenings.",
        },
        {
          id: "education",
          title: "Education",
          description:
            "Classes cover Bitcoin fundamentals, the whitepaper and protocol, self-custody and development.",
        },
      ],
    },
    experience: {
      eyebrow: "EXPERIENCE",
      title: "Exhibitions and wallet demos",
      introduction:
        "Bitcoin books and art are on display. You can try hardware wallets in the demo area.",
      areas: [
        {
          id: "exhibition",
          title: "Books and art",
          description:
            "Bitcoin books, a whitepaper display and Bitcoin-themed art.",
        },
        {
          id: "wallet",
          title: "Hardware wallet experience",
          description:
            "The demo area has several hardware wallets and instructions for testing them.",
        },
      ],
      walletExperienceLink: {
        label: "Wallet experience guide",
        href: "/experience/wallet",
      },
    },
    journal: {
      eyebrow: "HIGHLIGHTS",
      title: "Highlights",
      introduction: "Photos and reports from classes and meetups at the center.",
    },
    visit: {
      eyebrow: "VISIT",
      title: "Visit Bitcoin Center Seoul",
      introduction:
        "The center is a three-minute walk from Hongik University Station Exit 6. It is unavailable during private rentals.",
      address: {
        label: "Address",
        value: "30, Sinchon-ro 2an\u2011gil, Mapo-gu, Seoul, 2F",
        note: "3-minute walk from Hongik University Station Exit 6",
      },
      hours: {
        label: "Hours",
        lines: ["12:00 - 20:00", "Open daily, except public holidays", "Unavailable during private rentals"],
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
