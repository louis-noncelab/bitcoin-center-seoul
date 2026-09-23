import type { Locale } from "@/i18n/routing";
import type { LegalDocument } from "./legal-types";

export const privacyPolicy: Record<Locale, LegalDocument> = {
  ko: {
    title: "개인정보 처리방침",
    description: "비트코인 센터 서울의 주문, 행사, 문의 과정에서 처리하는 개인정보를 안내합니다.",
    introduction: "논스랩 주식회사는 비트코인 센터 서울의 주문·결제 확인, 상품 전달, 행사 참가 확인, 관련 안내와 문의 처리를 위해 개인정보를 처리합니다. 현재 구매는 회원가입 없이 진행됩니다. 계약 이행에 필요한 정보와 별도 동의가 필요한 정보를 각각 해당 법적 근거에 따라 처리합니다.",
    sections: [
      {
        heading: "1. 처리 항목과 목적",
        paragraphs: ["주문 시 이름과 이메일을 받습니다. 배송 주문에는 전화번호와 배송지(국가, 우편번호, 지역·도시, 상세 주소)가 필요합니다. 현장 수령에는 배송지를 받지 않으며 전화번호와 주문 요청사항은 선택 항목입니다.", "상품·수량·금액, 주문·결제 식별정보와 상태, 배송·수령 기록, 행사 참가권 확인·체크인 기록은 주문 이행, 결제 확인, 고객 응대와 분쟁 처리에 사용합니다. 주문 확인 링크와 코드는 다른 사람에게 공개하지 마세요.", "협업 제안에는 이름, 이메일, 제안 유형과 내용이 필요하고 소속·단체명은 선택 사항입니다. 이는 제안 검토와 답변에 사용합니다. 이메일 문의에는 발신 주소와 이용자가 보낸 이름·연락처·내용이 포함됩니다. 주민등록번호, 지갑 복구 문구 또는 개인키를 보내지 마세요."],
      },
      {
        heading: "2. 결제, 배송 및 외부 서비스",
        paragraphs: ["Zaprite 결제를 이용하면 고객 이름·이메일, 결제 금액·통화, 주문·결제 참조정보를 결제 요청과 상태 확인 및 영수증 발송을 위해 전달합니다. 라이트닝 주소 결제에는 금액, 인보이스와 결제 확인에 필요한 기술정보가 사용됩니다.", "배송을 선택하면 수령인 정보와 배송지를 배송에 필요한 범위에서 처리합니다. 국내 배송지 입력 화면에서는 검색 기능을 준비하기 위해 카카오 주소검색 스크립트를 불러오며 접속정보가 제공자에게 전달될 수 있습니다. 검색을 실행하면 검색어와 접속정보가 외부 주소검색 서비스에서 처리될 수 있습니다. 선택한 검색 결과는 주문 작성에 사용됩니다.", "주문·행사 관련 이메일과 운영 알림에는 해당 업무에 필요한 정보가 포함됩니다. 외부 영상의 재생을 선택하면 YouTube 플레이어에 연결되며 영상 제공자가 접속·기기정보 등을 처리할 수 있습니다."],
      },
      {
        heading: "3. 보유 기간",
        paragraphs: ["일반 개인정보의 보유기간은 수집일부터 최대 1년입니다. 문의·협업 제안, 미결제 주문의 연락처 및 업무용 이메일 내용 등은 해당 목적에 필요한 동안만 보유하며, 목적이 달성되거나 적법한 삭제·동의 철회 요청이 있으면 1년이 되기 전에도 지체 없이 파기합니다. 아직 이행 중인 계약이나 처리 중인 환불·분쟁은 적법한 처리 근거가 있는 범위에서 필요한 정보만 보유합니다.", "법정 보존 대상인 계약·청약철회 기록과 결제·공급 기록은 각 5년, 소비자 불만·분쟁 기록은 3년, 표시·광고 기록은 6개월 동안 별도 보존합니다. 해당 기록에 필요한 최소한의 정보만 보존하며 일반 업무·홍보에 사용하지 않습니다. 법정 기간이 끝나면 지체 없이 파기합니다. 주문 확인 링크의 만료가 거래기록의 삭제를 뜻하지는 않습니다.", "매년 보유 현황과 파기 이행을 정기 점검합니다. 정기 점검일까지 삭제를 미루지 않으며, 목적이 끝나거나 보유기간이 지난 정보는 복구·재생할 수 없도록 삭제하거나 문서를 파쇄합니다. 이메일 보관함·외부 처리업체·백업의 사본도 이 정책에 따른 파기 대상입니다. 백업에서 복구되더라도 파기 대상 정보를 일반 업무에 다시 사용하는 것은 허용되지 않습니다."],
      },
      {
        heading: "4. 브라우저 저장정보",
        paragraphs: ["장바구니의 상품 식별정보와 수량은 브라우저 로컬 저장소에 저장됩니다. 화면 테마는 1년 유효기간의 쿠키와 로컬 저장소에 기록됩니다. 브라우저 설정에서 쿠키와 사이트 데이터를 삭제하거나 차단할 수 있으며 이 경우 저장된 선택이 유지되지 않을 수 있습니다."],
      },
      {
        heading: "5. 보호 조치와 이용자의 권리",
        paragraphs: ["주문 연락처와 배송지 등 주요 정보와 이메일 내용의 저장에 암호화를 적용하고, 주문 접근정보와 관리자 인증으로 조회 권한을 제한합니다. 이용자 또는 적법한 대리인은 개인정보 열람·정정·삭제·처리정지 및 동의 철회를 요청할 수 있습니다. 본인 확인에 필요한 최소한의 정보를 확인한 뒤 관련 법령에 따라 결과 또는 제한 사유를 안내합니다. 법정 보존 대상은 즉시 삭제되지 않을 수 있습니다."],
      },
      {
        heading: "6. 개인정보 문의",
        paragraphs: ["개인정보 관련 요청과 고충은 hello@noncelab.com 또는 02-702-1718로 보내 주세요. 개인정보 침해 상담은 개인정보침해신고센터(118), 분쟁조정은 개인정보분쟁조정위원회(1833-6972)에서도 받을 수 있습니다."],
      },
      {
        heading: "7. 변경",
        paragraphs: ["처리 목적·항목이나 이용하는 서비스가 바뀌면 이 방침을 갱신하고 관련 법령에서 요구하는 통지 또는 동의 절차를 진행합니다."],
      },
    ],
  },
  en: {
    title: "Privacy policy",
    description: "How Bitcoin Center Seoul processes information for orders, events, and inquiries.",
    introduction: "Nonce Lab Inc. processes information to confirm Bitcoin Center Seoul orders and payments, fulfill purchases, confirm event attendance, send related notices, and respond to inquiries. Purchases currently use guest checkout. We process information needed for a contract and information requiring separate consent on the applicable legal basis.",
    sections: [
      {
        heading: "1. Information and purposes",
        paragraphs: ["Orders require a name and email address. Shipping orders also require a telephone number and delivery address (country, postal code, region, city, and address details). Pickup does not require a shipping address; a telephone number and order notes are optional.", "We use items, quantities, amounts, order and payment references and status, fulfillment records, and event ticket verification and check-in records to fulfill orders, confirm payments, support customers, and handle disputes. Keep order links and confirmation codes private.", "Collaboration proposals require a name, email, proposal type, and message; an organization is optional. We use these details to review and respond. Email inquiries contain the sender's address and any name, contact details, and message they provide. Do not send resident registration numbers, wallet recovery phrases, or private keys."],
      },
      {
        heading: "2. Payments, delivery, and external services",
        paragraphs: ["For Zaprite payments, we transmit your name, email address, amount, currency, and order and payment references to request and verify payment and send a receipt. Lightning-address payments involve amounts, invoices, and technical information needed to verify payment.", "For shipping orders, we process recipient and address details as needed for delivery. The domestic shipping address form loads the Kakao address-search script to prepare the optional lookup; this can share connection information with the provider. When you run a search, the external address service may process your search terms and connection information. The address you select is used to complete your order.", "Transactional email and operational notices contain information needed for the corresponding order or event. Playing an external video connects to YouTube, whose provider may process connection and device information."],
      },
      {
        heading: "3. Retention",
        paragraphs: ["General personal information is retained for up to one year from collection. Inquiries, collaboration proposals, contact details for unpaid orders, and operational email content are kept only while needed for their purpose. We erase them without delay when that purpose is fulfilled or a lawful erasure or consent-withdrawal request applies, even before one year has passed. For an ongoing contract, refund, or dispute, we retain only information necessary under a valid legal basis.", "Statutory records are retained separately: five years for contracts and withdrawals and for payment and supply, three years for consumer complaints and disputes, and six months for advertisements. We retain only the minimum information needed for those records, do not use it for general operations or promotion, and erase it without delay when the legal period ends. Expiry of an order link does not erase transaction records.", "We review retained information and deletion compliance every year. This review does not delay deletion until the annual review date. Information whose purpose or retention period has ended is deleted so it cannot be recovered or reproduced, or paper records are shredded. Copies in mailboxes, external providers, and backups are also subject to this policy's deletion requirements. Restoring a backup does not permit information due for deletion to be used again for general operations."],
      },
      {
        heading: "4. Browser storage",
        paragraphs: ["Local storage holds cart item references and quantities. A theme cookie lasts one year, and local storage also remembers the theme. You can delete or block cookies and site data in your browser settings, which may prevent those preferences from being saved."],
      },
      {
        heading: "5. Protection and your rights",
        paragraphs: ["We encrypt key stored order contact and address information and email content, and restrict access through order credentials and administrator authentication. You or an authorized representative may request access, correction, erasure, restriction of processing, and withdrawal of consent. We check only the information needed to establish your identity and handle the request under applicable law, explaining the outcome or any limitation. Legally required records may not be erased immediately."],
      },
      {
        heading: "6. Privacy contact",
        paragraphs: ["Send privacy requests or concerns to hello@noncelab.com or +82 2-702-1718. Korea's privacy infringement hotline is 118; the Personal Information Dispute Mediation Committee can be reached at 1833-6972."],
      },
      {
        heading: "7. Changes",
        paragraphs: ["If our purposes, information collected, or services change, we will update this policy and follow any notification or consent procedure required by law."],
      },
    ],
  },
};
