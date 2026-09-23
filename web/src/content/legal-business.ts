import type { Locale } from "@/i18n/routing";
import type { LegalDocument } from "./legal-types";

export const businessInformation: Record<Locale, LegalDocument> = {
  ko: {
    title: "사업자정보",
    description: "비트코인 센터 서울의 운영 주체와 연락처를 안내합니다.",
    details: [
      { label: "운영 주체", value: "논스랩 주식회사" },
      { label: "대표자", value: "고덕윤" },
      { label: "사업자등록번호", value: "568-88-01463" },
      { label: "통신판매업 신고번호", value: "제 2022-서울강서-0536" },
      { label: "통신판매업 신고 확인", value: "공정거래위원회 사업자정보 조회", href: "https://www.ftc.go.kr/bizCommPop.do?wrkr_no=5688801463" },
      { label: "사업장 및 센터 주소", value: "04056 서울특별시 마포구 신촌로2안길 30, 2층 (동교동, 비트코인 센터 서울)" },
      { label: "호스팅 서비스", value: "Amazon Web Services (AWS), 대한민국 서울 리전" },
      { label: "전화", value: "02-702-1718", href: "tel:+8227021718" },
      { label: "이메일", value: "hello@noncelab.com", href: "mailto:hello@noncelab.com" },
    ],
  },
  en: {
    title: "Business information",
    description: "The operator and contact details for Bitcoin Center Seoul.",
    details: [
      { label: "Operator", value: "Nonce Lab Inc. (논스랩 주식회사)" },
      { label: "Chief executive officer", value: "Deokyoon Ko (고덕윤)" },
      { label: "Business registration number", value: "568-88-01463" },
      { label: "Mail-order business registration", value: "제 2022-서울강서-0536 (2022-Seoul Gangseo-0536)" },
      { label: "Registration verification", value: "Korea Fair Trade Commission business lookup", href: "https://www.ftc.go.kr/bizCommPop.do?wrkr_no=5688801463" },
      { label: "Registered business and Center address", value: "2F, 30 Sinchon-ro 2an-gil, Mapo-gu, Seoul 04056, Republic of Korea" },
      { label: "Hosting service", value: "Amazon Web Services (AWS), Seoul Region, Republic of Korea" },
      { label: "Telephone", value: "+82 2-702-1718", href: "tel:+8227021718" },
      { label: "Email", value: "hello@noncelab.com", href: "mailto:hello@noncelab.com" },
    ],
  },
};
