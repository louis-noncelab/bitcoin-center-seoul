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
        paragraphs: ["주문 시 이름과 이메일을 받습니다. 배송 주문에는 전화번호, 국가·도시·기본 주소가 필요하며, 우편번호는 국내 배송 및 해당 국가에서 요구하는 경우 필수입니다. 지역과 상세 주소는 선택 항목입니다. 현장 수령에는 배송지를 받지 않으며 전화번호와 주문 요청사항은 선택 항목입니다.", "상품·수량·금액, 주문·결제 식별정보와 상태, 배송·수령 기록, 행사 참가권 확인·체크인 기록은 주문 이행, 결제 확인, 고객 응대와 분쟁 처리에 사용합니다. 주문 확인 링크와 코드는 다른 사람에게 공개하지 마세요.", "협업 제안에는 이름, 이메일, 제안 유형과 내용이 필요하고 소속·단체명은 선택 사항입니다. 이는 제안 검토와 답변에 사용합니다. 이메일 문의에는 발신 주소와 이용자가 보낸 이름·연락처·내용이 포함됩니다. 주민등록번호, 지갑 복구 문구 또는 개인키를 보내지 마세요."],
      },
      {
        heading: "1-1. 수집 방법과 서비스 보호",
        paragraphs: ["이용자가 주문서·협업 제안서에 직접 입력하거나 이메일·문의로 제공한 정보를 수집합니다. 결제 상태는 결제서비스의 응답과 상태 확인 과정에서, 배송·수령·체크인 기록은 해당 업무 처리 과정에서 생성됩니다.", "과도한 요청과 부정 사용을 막기 위해 요청의 IP 주소 등 접속 식별정보를 처리하며, 요청 제한용 저장소에는 이를 해시한 식별값, 요청 횟수와 만료 시각을 저장합니다. 만료된 제한 기록은 정리 과정에서 삭제합니다. 해시값이라고 해서 모든 개인정보 보호 의무가 없어지는 것은 아니며, 일반 개인정보의 보유·파기 원칙을 적용합니다."],
      },
      {
        heading: "1-2. 처리의 법적 근거",
        paragraphs: ["주문·결제·배송·현장 수령·행사 신청과 관련 문의에 필요한 이름·이메일, 필요한 경우 전화번호·배송지, 주문·결제·이행 기록은 「개인정보 보호법」 제15조 제1항 제4호의 계약 이행 또는 계약 체결 과정에서 이용자가 요청한 조치를 근거로 처리합니다. 계약에 필요한 필수 정보가 없으면 해당 주문을 처리할 수 없습니다. 주문 요청사항 등 선택 정보는 제공하지 않아도 기본 서비스를 이용할 수 있습니다.", "협업 제안서의 이름·이메일·유형·내용과 선택한 소속 정보는 제15조 제1항 제1호에 따른 제안자의 별도 동의로 검토·답변에 사용합니다. 동의를 거부하면 온라인 제안서 접수는 이용할 수 없습니다. 동의 철회는 개인정보 문의 창구로 요청할 수 있습니다.", "법정 거래기록의 보존은 제15조 제1항 제2호와 「전자상거래 등에서의 소비자보호에 관한 법률」 제6조 및 같은 법 시행령 제6조를 근거로 합니다. 계약 이행이나 법정 보존을 위한 처리를 마케팅 동의와 묶지 않습니다."],
      },
      {
        heading: "2. 결제, 배송 및 외부 서비스",
        paragraphs: ["Zaprite 결제를 이용하면 고객 이름·이메일, 결제 금액·통화, 주문·결제 참조정보를 결제 요청과 상태 확인 및 영수증 발송을 위해 전달합니다. 라이트닝 주소 결제에는 금액, 인보이스와 결제 확인에 필요한 기술정보가 사용됩니다.", "배송을 선택하면 CJ대한통운에 수령인 이름·전화번호·배송지와 배송에 필요한 주문·상품 정보를 전달하여 배송, 반품 수거 및 배송 문의를 처리합니다. 국내 배송지 입력 화면에서는 검색 기능을 준비하기 위해 카카오 주소검색 스크립트를 불러오며 접속정보가 제공자에게 전달될 수 있습니다. 검색을 실행하면 검색어와 접속정보가 외부 주소검색 서비스에서 처리될 수 있습니다. 선택한 검색 결과는 주문 작성에 사용됩니다.", "주문·행사 안내 및 문의 응대 이메일은 Google Workspace 조직 계정의 Gmail을 통해 송수신합니다. 이메일 주소, 이름과 해당 업무에 필요한 주문·문의 내용이 처리됩니다. 웹훅 방식의 운영 알림은 수신 서비스를 정한 후 도입할 예정입니다. 개인정보를 외부로 전송하기 전 수신 업체, 처리 업무·항목 및 해당하는 국외이전 사항을 공개하고 필요한 법적 절차를 이행합니다. 위치 지도를 표시할 때 Google Maps에 연결되어 IP 주소 등 접속정보가 제공자에게 전달될 수 있습니다. 외부 영상의 재생을 선택하면 YouTube 플레이어에 연결되며 영상 제공자가 접속·기기정보 등을 처리할 수 있습니다."],
      },
      {
        heading: "2-1. 서버·보관 및 업무별 서비스",
        paragraphs: ["웹사이트 서버, 데이터베이스와 백업은 Amazon Web Services(AWS)의 대한민국 서울 리전(ap-northeast-2)을 사용합니다. 웹사이트 운영, 주문·문의 데이터의 저장과 복구에 필요한 정보를 처리합니다.", "이메일 송수신에는 Google Workspace 조직 계정의 Gmail, 상품 배송·반품 수거에는 CJ대한통운을 이용합니다. 해당 업무에 필요한 최소한의 정보를 처리하며, 회사의 일반 보유·파기 기준과 법정 보존 의무를 구분하여 관리합니다.", "Google Workspace의 공개 데이터 처리 약정은 별도의 데이터 위치 약정 범위에서 Google 또는 재수탁자의 시설이 있는 국가에서 정보를 처리할 수 있도록 정합니다. Google 및 재수탁자의 처리 위치에 따라 이메일 정보가 대한민국 밖에서 처리될 수 있으며, 회사의 AWS 서울 리전 설정이 Google Workspace 이메일의 국내 보관을 보장하지는 않습니다. 이메일 내용과 보관함에도 아래 보유·파기 기준을 적용합니다. 회사가 복구할 수 없도록 삭제한 뒤에도 Google 시스템의 사본 삭제에는 처리 시간이 필요할 수 있으며, Google의 공개 데이터 처리 약정은 법령상 보존 예외를 제외하고 삭제 지시 이행에 최대 180일을 정합니다. 이는 회사가 파기 대상 정보를 일반 업무에 계속 사용하거나 보유기간을 연장하는 근거가 아닙니다."],
      },
      {
        heading: "3. 보유 기간",
        paragraphs: ["일반 개인정보의 보유기간은 수집일부터 최대 1년입니다. 문의·협업 제안, 미결제 주문의 연락처 및 업무용 이메일 내용 등은 해당 목적에 필요한 동안만 보유하며, 목적이 달성되거나 적법한 삭제·동의 철회 요청이 있으면 1년이 되기 전에도 지체 없이 파기합니다. 아직 이행 중인 계약이나 처리 중인 환불·분쟁은 적법한 처리 근거가 있는 범위에서 필요한 정보만 보유합니다.", "법정 보존 대상인 계약·청약철회 기록과 결제·공급 기록은 각 5년, 소비자 불만·분쟁 기록은 3년, 표시·광고 기록은 6개월 동안 별도 보존합니다. 해당 기록에 필요한 최소한의 정보만 보존하며 일반 업무·홍보에 사용하지 않습니다. 법정 기간이 끝나면 지체 없이 파기합니다. 주문 확인 링크의 만료가 거래기록의 삭제를 뜻하지는 않습니다.", "세무상 장부·증거서류에 해당하는 최소한의 거래 정보는 「국세기본법」 제85조의3 등 해당 법령에 따라 별도 보존합니다. 일반적으로 해당 과세기간의 법정신고기한이 지난 날부터 5년이며, 법정 역외거래는 7년 등 별도 기간이 적용될 수 있습니다. 이는 전자상거래 기록의 보존 기간과 기산점이 다르며, 모든 고객 연락처·배송지에 일률적으로 적용하지 않습니다. 법정 보존 대상과 일반 업무 정보를 구분하여 기간 만료 후 파기합니다.", "매년 보유 현황과 파기 이행을 정기 점검합니다. 정기 점검일까지 삭제를 미루지 않으며, 목적이 끝나거나 보유기간이 지난 정보는 복구·재생할 수 없도록 삭제하거나 문서를 파쇄합니다. 이메일 보관함·외부 처리업체·백업의 사본도 이 정책에 따른 파기 대상입니다. 백업에서 복구되더라도 파기 대상 정보를 일반 업무에 다시 사용하는 것은 허용되지 않습니다."],
      },
      {
        heading: "4. 브라우저 저장정보",
        paragraphs: ["장바구니의 상품 식별정보와 수량은 브라우저 로컬 저장소에 저장됩니다. 화면 테마는 1년 유효기간의 쿠키와 로컬 저장소에 기록됩니다.", "비회원 견적·주문 조회 권한 확인을 위해 접근 토큰 쿠키를 사용합니다. 견적 쿠키는 1시간, 주문 쿠키는 30일 후 만료됩니다. 쿠키의 만료와 서버의 거래기록 보존 기간은 다릅니다. 브라우저 설정에서 쿠키와 사이트 데이터를 삭제하거나 차단할 수 있으며, 이 경우 저장된 선택이나 견적·주문 조회 기능이 제한될 수 있습니다."],
      },
      {
        heading: "5. 보호 조치와 이용자의 권리",
        paragraphs: ["주문 연락처와 배송지 등 주요 정보와 이메일 내용의 저장에 암호화를 적용하고, 주문 접근정보와 관리자 인증으로 조회 권한을 제한합니다. 이용자 또는 적법한 대리인은 개인정보 열람·정정·삭제·처리정지 및 동의 철회를 요청할 수 있습니다. 본인 확인에 필요한 최소한의 정보를 확인한 뒤 관련 법령에 따라 결과 또는 제한 사유를 안내합니다. 법정 보존 대상은 즉시 삭제되지 않을 수 있습니다."],
      },
      {
        heading: "5-1. 아동과 법정대리인의 권리",
        paragraphs: ["만 14세 미만 아동의 개인정보를 동의에 근거하여 처리해야 하는 경우에는 법정대리인의 동의를 받고 그 동의 여부를 확인해야 합니다. 아동을 위한 주문·행사 신청은 법정대리인이 센터에 먼저 문의해 주세요. 보호자는 가능한 한 자신의 연락처를 사용하고, 주문에 필요하지 않은 아동의 생년월일·학교 등 추가 정보를 보내지 마세요.", "아동의 법정대리인은 아동의 개인정보에 관하여 열람·정정·삭제·처리정지 등을 요청할 수 있습니다. 필요한 법정대리인 동의 없이 수집된 아동 정보가 확인되면 적법한 처리 근거를 확인하고, 근거가 없는 정보는 처리를 중단하고 지체 없이 삭제하는 등 필요한 조치를 합니다."],
      },
      {
        heading: "6. 개인정보 보호책임자 및 문의",
        paragraphs: ["개인정보 보호책임자는 대표이사 고덕윤입니다. 개인정보 관련 요청과 고충은 hello@noncelab.com 또는 02-702-1718로 보내 주세요. 개인정보 침해 상담은 개인정보침해신고센터(118), 분쟁조정은 개인정보분쟁조정위원회(1833-6972)에서도 받을 수 있습니다."],
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
        paragraphs: ["Orders require a name and email address. Shipping orders also require a telephone number, country, city, and street address. Postal codes are required for domestic shipping and destinations that require them. Region and address details are optional. Pickup does not require a shipping address; a telephone number and order notes are optional.", "We use items, quantities, amounts, order and payment references and status, fulfillment records, and event ticket verification and check-in records to fulfill orders, confirm payments, support customers, and handle disputes. Keep order links and confirmation codes private.", "Collaboration proposals require a name, email, proposal type, and message; an organization is optional. We use these details to review and respond. Email inquiries contain the sender's address and any name, contact details, and message they provide. Do not send resident registration numbers, wallet recovery phrases, or private keys."],
      },
      {
        heading: "1-1. Collection methods and service protection",
        paragraphs: ["We collect information you enter in checkout or collaboration forms or provide through email and inquiries. Payment status comes from payment-service responses and verification. Fulfillment and check-in records arise when those tasks are performed.", "To prevent excessive requests and misuse, we process connection identifiers such as the request's IP address. The request-limiting store holds a hashed identifier, request count, and expiry time. Expired entries are deleted during cleanup. Hashing does not remove all privacy obligations; our general retention and deletion principles apply."],
      },
      {
        heading: "1-2. Legal bases for processing",
        paragraphs: ["Names, email addresses, required telephone and shipping details, and order, payment, and fulfillment records needed for purchases, delivery, pickup, events, and related inquiries are processed to perform a contract or take steps requested before a contract under Article 15(1)(4) of Korea's Personal Information Protection Act. We cannot fulfill an order without its required information. Optional details such as order notes are not required to use the basic service.", "We use a collaboration proposal's name, email, type, message, and any supplied organization to review and respond based on the proposer's separate consent under Article 15(1)(1). Without consent, the online proposal form cannot be used. You can request withdrawal of consent through the privacy contact channel.", "Statutory transaction-record retention is based on Article 15(1)(2), Article 6 of Korea's Act on the Consumer Protection in Electronic Commerce, Etc., and Article 6 of its Enforcement Decree. Processing needed for contracts or statutory retention is not bundled with marketing consent."],
      },
      {
        heading: "2. Payments, delivery, and external services",
        paragraphs: ["For Zaprite payments, we transmit your name, email address, amount, currency, and order and payment references to request and verify payment and send a receipt. Lightning-address payments involve amounts, invoices, and technical information needed to verify payment.", "For shipping orders, we send the recipient’s name, telephone number, address, and necessary order and item details to CJ Logistics (CJ대한통운) for delivery, return collection, and delivery support. The domestic shipping address form loads the Kakao address-search script to prepare the optional lookup; this can share connection information with the provider. When you run a search, the external address service may process your search terms and connection information. The address you select is used to complete your order.", "We send and receive order and event notices and inquiry responses through Gmail through an organizational Google Workspace account. This involves email addresses, names, and the order or inquiry content needed for the task. Operational alerts using webhooks are planned after a receiving service is selected. Before transmitting personal information externally, we will disclose the recipient, processing tasks and information, and any applicable overseas transfers, and complete required legal procedures. Displaying the location map connects to Google Maps and may transmit connection information, including your IP address, to its provider. Playing an external video connects to YouTube, whose provider may process connection and device information."],
      },
      {
        heading: "2-1. Hosting, storage, and service providers",
        paragraphs: ["The website server, database, and backups use Amazon Web Services (AWS) in the Seoul Region (ap-northeast-2), Republic of Korea. Information needed to operate the website and store and recover order and inquiry data is processed there.", "We use Gmail through an organizational Google Workspace account for email and CJ Logistics for product delivery and return collection. We process only the information needed for each task and distinguish our general retention and deletion rules from statutory retention duties.", "Google Workspace’s published data processing terms permit processing in countries where Google or its subprocessors have facilities, subject to applicable data-location commitments. Email information may be processed outside the Republic of Korea depending on where Google and its subprocessors operate; our AWS Seoul Region setting does not guarantee that Google Workspace email stays in Korea. The retention and deletion rules below also apply to email content and mailboxes. After deletion makes data unrecoverable by the Company, copies in Google’s systems may require further deletion time. Google’s published data processing terms allow up to 180 days to comply with a deletion instruction, subject to statutory storage exceptions. This does not permit the Company to keep using information due for deletion or extend its ordinary retention period."],
      },
      {
        heading: "3. Retention",
        paragraphs: ["General personal information is retained for up to one year from collection. Inquiries, collaboration proposals, contact details for unpaid orders, and operational email content are kept only while needed for their purpose. We erase them without delay when that purpose is fulfilled or a lawful erasure or consent-withdrawal request applies, even before one year has passed. For an ongoing contract, refund, or dispute, we retain only information necessary under a valid legal basis.", "Statutory records are retained separately: five years for contracts and withdrawals and for payment and supply, three years for consumer complaints and disputes, and six months for advertisements. We retain only the minimum information needed for those records, do not use it for general operations or promotion, and erase it without delay when the legal period ends. Expiry of an order link does not erase transaction records.", "Minimum transaction information constituting tax books or supporting records is retained separately under Article 85-3 of Korea's Framework Act on National Taxes and other applicable rules. The usual period is five years after the statutory filing deadline for the relevant tax period; separate periods may apply, such as seven years for statutory offshore transactions. These periods and starting dates differ from electronic-commerce retention and do not apply indiscriminately to all customer contact or delivery information. Statutory records are separated from general operational information and deleted when their retention period ends.", "We review retained information and deletion compliance every year. This review does not delay deletion until the annual review date. Information whose purpose or retention period has ended is deleted so it cannot be recovered or reproduced, or paper records are shredded. Copies in mailboxes, external providers, and backups are also subject to this policy's deletion requirements. Restoring a backup does not permit information due for deletion to be used again for general operations."],
      },
      {
        heading: "4. Browser storage",
        paragraphs: ["Local storage holds cart item references and quantities. A theme cookie lasts one year, and local storage also remembers the theme.", "Access-token cookies verify permission to view guest quotes and orders. Quote cookies expire after one hour and order cookies after 30 days. Cookie expiry differs from server-side transaction-record retention. You can delete or block cookies and site data in your browser settings, which may affect saved preferences or access to quotes and orders."],
      },
      {
        heading: "5. Protection and your rights",
        paragraphs: ["We encrypt key stored order contact and address information and email content, and restrict access through order credentials and administrator authentication. You or an authorized representative may request access, correction, erasure, restriction of processing, and withdrawal of consent. We check only the information needed to establish your identity and handle the request under applicable law, explaining the outcome or any limitation. Legally required records may not be erased immediately."],
      },
      {
        heading: "5-1. Children and legal representatives",
        paragraphs: ["Where processing a child under 14's information requires consent, the child's legal representative must give consent and that consent must be verified. A legal representative should contact the Center before ordering or registering for an event for a child. Where possible, use the representative's contact details and do not provide extra information, such as the child's birth date or school, that the order does not need.", "A child's legal representative may request access, correction, erasure, or suspension of processing of the child's information. If we identify child information collected without required representative consent, we check the legal basis and take necessary measures, including stopping processing and erasing without delay where there is no lawful basis."],
      },
      {
        heading: "6. Privacy officer and contact",
        paragraphs: ["Our privacy officer is Deokyoon Ko (고덕윤), Chief Executive Officer. Send privacy requests or concerns to hello@noncelab.com or +82 2-702-1718. Korea's privacy infringement hotline is 118; the Personal Information Dispute Mediation Committee can be reached at 1833-6972."],
      },
      {
        heading: "7. Changes",
        paragraphs: ["If our purposes, information collected, or services change, we will update this policy and follow any notification or consent procedure required by law."],
      },
    ],
  },
};
