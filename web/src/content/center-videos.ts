import centerVisit from "@/assets/videos/center-visit.jpg";
import teamDay from "@/assets/videos/team-day.jpg";
import founderInterview from "@/assets/videos/founder-interview.jpg";

export const centerVideos = [
  {
    id: "pXK4KZkJ824", thumbnail: centerVisit,
    title: {
      ko: "한국의 비트코인 성지 '비트코인\u00a0센터\u00a0서울' 방문하면 진짜 이거 다 줍니다",
      en: "Inside Bitcoin Center Seoul: meetups, books and Bitcoin board games",
    },
  },
  {
    id: "oJNES8yse00", thumbnail: teamDay,
    title: {
      ko: "비트코인에 올인한 대한민국 1등 회사는 하락장에 어떻게 됐을까",
      en: "A day with Nonce Lab, the team behind the center",
    },
  },
  {
    id: "lIuNoBffEMo", thumbnail: founderInterview,
    title: {
      ko: "이더리움이요? 7년차 회사 대표가 블록체인 사업 접고 비트코인에 올인한 이유",
      en: "Why Nonce Lab’s founder went all in on Bitcoin",
    },
  },
] as const;
