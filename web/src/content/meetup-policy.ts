import type { Locale } from "@/i18n/routing";
import type { CheckoutPolicyKind } from "@/lib/commerce-kind";
import { checkoutDisclosure } from "./checkout-disclosure";
import { termsOfService } from "./legal-terms";
import { refundPolicy } from "./legal-refunds";
import type { LegalDocument, LegalSection } from "./legal-types";

function originalSection(document: LegalDocument, number: string): LegalSection {
  const section = document.sections?.find((entry) => entry.heading.startsWith(`${number}. `));
  if (!section) throw new Error(`Missing legal section: ${number}`);
  return section;
}

export function purchaseDisclosure(locale: Locale, kind: CheckoutPolicyKind): readonly string[] {
  const original = checkoutDisclosure[locale];
  if (kind === "mixed") return original;
  if (kind === "goods") return [original[0], original[1], original[3]];
  if (kind === "free_meetup") return [locale === "ko"
    ? "무료 신청은 결제 없이 확정됩니다. 참석이 어려우면 신청번호와 함께 센터에 알려 주세요."
    : "Free registration is confirmed without payment. If you cannot attend, contact the Center with your registration reference.", original[3]];
  return [locale === "ko"
    ? "환불은 최초 결제한 사토시를 기준으로 비트코인으로 반환합니다. 환불일 환율로 다시 계산하지 않으며, 법정 소비자 권리는 유지됩니다."
    : "Refunds return the original satoshi amount paid in Bitcoin, without recalculation at the refund-date rate. Statutory consumer rights remain intact.", original[2], original[3]];
}

export function purchaseTerms(locale: Locale, kind: CheckoutPolicyKind): LegalDocument {
  if (kind === "mixed") return termsOfService[locale];
  const ko = locale === "ko";
  const free = kind === "free_meetup";
  const original = termsOfService[locale];
  if (kind === "goods") return {
    ...original,
    title: ko ? "상품 주문 이용약관" : "Goods order terms",
    description: ko ? "센터 상품 주문과 수령에 관한 조건입니다." : "Terms for ordering and receiving Center goods.",
    introduction: ko ? "이 약관은 논스랩 주식회사가 운영하는 비트코인 센터 서울의 상품 주문에 적용됩니다. 개별 상품의 표시 조건도 계약의 일부가 되며, 강행 법규가 우선 적용됩니다. 운영자와 연락처는 사업자정보에서 확인할 수 있습니다. 외부 운영자와 직접 체결한 거래는 해당 운영자의 조건을 확인해 주세요." : "These terms apply to goods ordered from Bitcoin Center Seoul, operated by Nonce Lab Inc. Disclosed item conditions form part of the contract, subject to mandatory law. Operator details and contacts appear in Business Information. Check the operator's terms for transactions made directly with an external operator.",
    sections: (original.sections ?? []).filter((section) => !section.heading.startsWith("7-1. ")).map((section) => ({
      ...section,
      heading: section.heading.replace("상품 배송, 수령과 행사 참여", "상품 배송과 수령").replace("Delivery, collection, and events", "Delivery and collection"),
      paragraphs: ((section.heading.startsWith("4. ") ? section.paragraphs?.slice(0, 2) : section.paragraphs) ?? []).map((paragraph) => paragraph
        .replace("센터는 방문 안내, 행사, 전시 정보, 자료 소개, 자체 상품 주문과 유료 행사 신청 기능을 제공합니다. 사이트의 외부 행사 신청, 서비스 링크를 통해 다른 운영자 사이트에서 직접 거래하는 경우, 거래 상대방과 조건은 그 사이트에서 확인해 주세요.", "센터는 자체 상품 주문 기능을 제공합니다. 외부 서비스 링크를 통해 다른 운영자와 직접 거래하는 경우 해당 운영자와 조건을 확인해 주세요.")
        .replace("The Center provides visitor information, events and exhibitions, resource listings, orders for its own products, and registration for paid events. If you transact directly on another operator's site through an external event-registration or service link, check that operator and its terms there.", "The Center offers orders for its own goods. For transactions made directly with another operator through an external link, check that operator and its terms.")
        .replace("상품, 행사의 결제", "상품의 결제").replace("products or events through", "products through")
        .replace("상품, 행사 신청은", "상품 주문은").replace("주문 또는 참가 확정", "주문 확정").replace("order or attendance acceptance", "order acceptance")
        .replace("재고 부족, 행사 정원, 기간 초과,", "재고 부족, 기간 초과,").replace("insufficient stock, an event's capacity or date,", "insufficient stock, an order deadline,")
        .replace("재고나 좌석", "재고").replace("stock or seats", "stock").replace("재고, 좌석", "재고").replace("price, stock, or seat", "price or stock")
        .replace("상품 반품과 행사 취소", "상품 반품").replace("Paid-order returns and event cancellations", "Paid-order returns")
        .replace("상품 구매나 행사 참가로", "상품 구매로").replace("Buying a product or attending an event", "Buying a product")
        .replace("주문 확인 링크, 코드와 행사 참가권", "주문 확인 링크와 코드").replace("order links, codes, and event tickets", "order links and codes")
        .replace(" 행사 참여 시에는 사전에 안내된 연령, 안전, 시설 이용 규칙을 지켜 주세요.", "").replace(" Follow the age, safety, and venue rules disclosed for an event.", "")
        .replace("결제, 배송, 행사 변경", "결제와 배송 변경").replace("payment, delivery, and event changes", "payment and delivery changes")
        .replace("주문, 결제, 배송, 행사와 문의", "주문, 결제, 배송과 문의").replace("orders, payments, delivery, events, and inquiries", "orders, payments, delivery, and inquiries")
        .replace("주문, 결제, 배송, 행사, 환불", "주문, 결제, 배송, 환불").replace("orders, payment, delivery, events, or refunds", "orders, payment, delivery, or refunds")),
    })),
  };
  return {
    title: ko ? "밋업 신청 이용약관" : "Event registration terms",
    description: ko ? "센터 밋업 신청과 참여에 관한 조건입니다." : "Terms for registering for and attending Center events.",
    introduction: ko
      ? "이 약관은 논스랩 주식회사가 운영하는 비트코인 센터 서울의 밋업 신청에 적용됩니다. 개별 행사에 표시된 조건도 계약의 일부가 되며, 강행 법규가 우선 적용됩니다. 운영자와 연락처는 사업자정보에서 확인할 수 있습니다. 외부 운영자와 직접 체결한 거래는 해당 운영자의 조건을 확인해 주세요."
      : "These terms apply to event registration at Bitcoin Center Seoul, operated by Nonce Lab Inc. Disclosed event conditions also form part of the contract, subject to mandatory law. Operator details and contacts appear in Business Information. For transactions made directly with an external operator, check that operator's terms.",
    sections: [
      { heading: ko ? "1. 신청과 확정" : "1. Registration and confirmation", paragraphs: [
        ko ? "비회원으로 신청할 수 있습니다. 정확한 이름과 연락처를 입력해 주세요. 행사 정원, 신청 기간이나 안내 내용의 명백한 오류로 신청을 진행할 수 없으면 사유와 다음 절차를 안내합니다. 이 조항이 성립한 계약을 임의로 취소하거나 소비자의 권리를 제한하는 근거가 되지는 않습니다." : "You may register without an account. Provide an accurate name and contact details. If capacity, registration dates, or an obvious listing error prevents registration, the Center explains why and the next steps. This does not permit arbitrary cancellation of a concluded contract or restriction of consumer rights.",
        free
          ? (ko ? "확인 화면이나 이메일에서 신청 확정을 안내한 때에 참가 신청이 확정됩니다. 신청번호와 확인 링크를 안전하게 보관해 주세요." : "Registration is confirmed when the confirmation page or email communicates acceptance. Keep your registration reference and confirmation link secure.")
          : (ko ? "신청 접수나 결제 요청 발행만으로 참가가 확정되지는 않습니다. 센터가 결제를 확인하고 화면이나 이메일로 참가 확정을 통지한 때에 계약이 성립합니다. 단순 접수, 입금 확인 중, 추가 검토 안내는 확정 통지가 아닙니다." : "Receiving a registration or issuing a payment request does not itself confirm attendance. The contract forms when, after verifying payment, the Center communicates attendance acceptance through the page or email. An acknowledgment, pending verification, or further review is not acceptance."),
      ] },
      { ...originalSection(original, "2-1"), heading: ko ? "2. 신청 확인과 부정 이용 대응" : "2. Registration verification and fraud prevention", paragraphs: [
        ko ? "도용, 허위 신청, 결제 위조나 변조, 좌석을 부당하게 점유하는 반복 신청의 객관적 정황이 있으면 필요한 최소한의 확인 자료를 요청할 수 있습니다. 계약 성립 전 합리적 기간 동안 승낙을 보류하거나 정당한 사유를 안내하여 신청을 거절할 수 있습니다. 법정 처리 기한을 넘겨 확인을 지연하거나 정상적인 청약철회 이력만으로 부정 신청으로 취급하지 않습니다." : "Where objective circumstances indicate impersonation, fraudulent registration, falsified payment, or repeated registrations improperly tying up seats, the Company may request the minimum necessary verification. Before a contract forms, it may withhold acceptance for a reasonable period or decline with a justified explanation. Verification must not exceed statutory deadlines, and lawful withdrawals alone are not treated as fraud.",
        ...(originalSection(original, "2-1").paragraphs?.slice(1) ?? []),
      ] },
      ...(free ? [] : [
        { ...originalSection(original, "3"), paragraphs: [ko ? "참가비와 인원별 합계는 신청 화면에서 확인할 수 있습니다. 실제 비트코인 결제 금액은 표시된 사토시 견적과 결제 요청에서 확인해야 합니다. 기한과 수취 정보를 확인하고 송금해 주세요." : "The registration page shows the fee and total for your attendees. Check the satoshi quote and payment request for the Bitcoin amount. Confirm the deadline and recipient before sending.", ...(originalSection(original, "3").paragraphs?.slice(1) ?? [])] },
        { ...originalSection(original, "3-1"), paragraphs: [ko ? "송금 전 결제 금액, 지원 네트워크, 수취 주소, 인보이스와 유효기간을 확인해 주세요. 만료, 취소 후 송금이나 부족, 초과, 중복 송금은 참가를 자동 확정하거나 기존 가격과 좌석을 보장하지 않습니다. 센터는 실제 수취 여부를 확인하여 추가 이행 합의 또는 적법한 반환 절차를 안내합니다." : "Before sending, check the amount, supported network, recipient or invoice, and expiry. Late, post-cancellation, insufficient, excess, or duplicate payments do not automatically confirm attendance or guarantee the previous price or seat. The Center verifies receipt and explains any agreed attendance or lawful refund procedure.", ...(originalSection(original, "3-1").paragraphs?.slice(1) ?? [])] },
        originalSection(original, "3-2"),
      ]),
      { heading: ko ? "4. 행사 참여와 변경" : "4. Attendance and event changes", paragraphs: [
        ...(originalSection(original, "4").paragraphs?.slice(2) ?? []),
        ko ? "일정과 참여 장소는 신청 화면과 확인 페이지에서 확인해 주세요. 온라인 행사 참여 정보는 확정된 신청에 제공됩니다. 현장 행사는 안내된 장소와 확인 방법을 따릅니다." : "Check the registration and confirmation pages for the schedule and venue. Online joining information is provided for confirmed registrations. For in-person events, follow the disclosed venue and verification instructions.",
      ] },
      { heading: ko ? "5. 신청 취소" : "5. Cancelling registration", paragraphs: [
        free ? (ko ? "참석이 어려우면 hello@noncelab.com으로 신청번호와 함께 알려 주세요. 센터가 행사를 취소하거나 주요 내용을 바꾸면 제공된 연락처와 확인 화면으로 안내합니다." : "If you cannot attend, email hello@noncelab.com with your registration reference. Event cancellations or material changes are communicated through the supplied contact details and confirmation page.") : (ko ? "결제 전에는 신청 확인 화면에서 가능한 상태일 때 직접 취소할 수 있습니다. 결제 요청이 발행되었거나 결제가 진행 중이면 센터에 문의해 주세요. 결제 후 취소는 밋업 취소 및 환불정책과 관련 법령에 따릅니다." : "Before payment, you can cancel on your registration details page while that option is available. If payment has been requested or is in progress, contact the Center. Paid registration cancellations follow the Event Cancellation and Refund Policy and applicable law."),
        ...(free ? [] : originalSection(original, "5").paragraphs?.slice(1) ?? []),
      ] },
      { ...originalSection(original, "6"), paragraphs: [
        ko ? "센터가 직접 제작하거나 적법하게 권리를 취득한 글, 사진, 영상, 디자인과 콘텐츠의 권리는 센터 또는 해당 권리자에게 있습니다. 게시되었다는 이유로 제3자의 콘텐츠와 상표에 관한 권리가 이전되지는 않습니다. 권리자의 허락 또는 관련 법령이 허용하는 경우를 제외하고 보호받는 콘텐츠를 복제, 재게시, 배포, 공중송신하거나 상업적으로 이용해서는 안 됩니다. 행사 참가로 저작권이나 상표권이 이전되지 않습니다." : "Rights in content created or lawfully obtained by the Center belong to the Center or the relevant rightsholder. Publication does not transfer third-party content or trademark rights. Except with permission or as permitted by law, protected content must not be reproduced, reposted, distributed, publicly transmitted, or commercially exploited. Attendance does not transfer copyright or trademark rights.",
        ...(originalSection(original, "6").paragraphs?.slice(2) ?? []),
      ] },
      originalSection(original, "7"), originalSection(original, "7-1"),
      { heading: ko ? "8. 신청 확인과 안내" : "8. Registration details and notices", paragraphs: [
        ko ? "신청 내용과 상태는 확인 페이지에서 확인할 수 있습니다. 입력 오류는 화면에서 가능한 범위에서 수정 또는 취소하거나 센터에 연락해 주세요. 서비스가 이미 제공된 경우에는 관련 법령과 해당 취소 정책을 따릅니다. 센터는 입력한 이메일과 연락처 또는 확인 화면으로 참가 확정, 행사 변경 등 계약 이행에 필요한 사항을 안내합니다. 연락처 오류로 안내를 받지 못한 경우 확인을 요청할 수 있으며, 이것만으로 법정 권리가 제한되지는 않습니다." : "Your confirmation page shows registration details and status. Correct or cancel input errors where available, or contact the Center. After a service has been supplied, applicable law and the relevant cancellation policy govern. The Center uses your supplied contact details or confirmation page for acceptance, event changes, and other necessary notices. Incorrect contact details do not alone restrict statutory rights; ask the Center to confirm missed notices.",
      ] },
      originalSection(original, "9"),
      { ...originalSection(original, "10"), paragraphs: [ko ? "센터는 신청, 결제, 행사와 문의 처리에 필요한 개인정보를 관련 법령과 별도 개인정보 처리방침에 따라 처리합니다. 수집 항목, 목적, 보유기간, 외부 서비스 이용과 권리 행사 방법은 개인정보 처리방침에서 확인할 수 있습니다. 약관 동의가 별도 동의가 필요한 개인정보 처리의 동의를 대신하지 않습니다." : "The Center processes information needed for registration, payment, events, and inquiries under applicable law and the separate Privacy Policy. See that policy for categories, purposes, retention, external services, and rights. Accepting these terms does not replace separately required consent for personal information processing."] },
      { ...originalSection(original, "11"), paragraphs: (originalSection(original, "11").paragraphs ?? []).map((paragraph) => paragraph.replace("외부 결제, 배송 업체", "외부 결제, 행사 운영 업체").replace("external payment or delivery providers", "external payment or event providers")) },
      originalSection(original, "12"),
      { ...originalSection(original, "13"), paragraphs: (originalSection(original, "13").paragraphs ?? []).map((paragraph) => paragraph.replace("주문, 결제, 배송, 행사, 환불", "신청, 결제, 행사, 환불").replace("orders, payment, delivery, events, or refunds", "registration, payment, events, or refunds")) },
      originalSection(original, "14"),
    ],
  };
}

export function purchaseRefunds(locale: Locale, kind: CheckoutPolicyKind): LegalDocument {
  const original = refundPolicy[locale];
  if (kind === "mixed") return original;
  const ko = locale === "ko";
  if (kind === "goods") return { ...original,
    description: ko ? "센터 상품의 반품과 환불 신청 방법을 안내합니다." : "How to request a return or refund for Center goods.",
    introduction: (original.introduction ?? "").replace("상품과 유료 행사", "상품").replace("products and paid events", "products"),
    sections: (original.sections ?? []).filter((section) => !section.heading.startsWith("3. ")),
  };
  const free = kind === "free_meetup";
  return {
    title: free ? (ko ? "무료 밋업 취소 안내" : "Free registration cancellation") : (ko ? "밋업 취소 및 환불정책" : "Event cancellation and refund policy"),
    description: free ? (ko ? "무료 신청을 취소하는 방법을 안내합니다." : "How to cancel a free registration.") : (ko ? "유료 밋업의 취소와 참가비 환불 방법을 안내합니다." : "How to cancel a paid event registration and request a fee refund."),
    introduction: ko ? "이 안내는 센터가 직접 운영하는 밋업 신청에 적용됩니다. 외부 운영자와 직접 체결한 거래는 해당 운영자의 정책을 확인해 주세요. 법령이 보장하는 권리가 우선합니다." : "This policy applies to events operated directly by the Center. For transactions made directly with an external operator, check that operator's policy. Statutory rights take precedence.",
    sections: [
      { heading: ko ? "1. 취소 방법" : "1. How to cancel", paragraphs: [free
        ? (ko ? "신청번호, 신청자 이름과 연락 가능한 이메일을 hello@noncelab.com으로 보내 주세요. 센터가 신청을 취소하면 해당 인원만큼 자리가 다시 열립니다." : "Email hello@noncelab.com with your registration reference, name, and contact email. Once the Center cancels the registration, the registered seats are released.")
        : (ko ? "신청번호, 신청자 이름, 연락 가능한 이메일과 취소 사유를 hello@noncelab.com으로 보내 주세요. 센터가 다음 절차를 안내합니다. 센터의 사전 승인은 법정 청약철회의 요건이 아닙니다. 비트코인 수취 정보는 환급 방법을 합의한 뒤 별도로 확인합니다." : "Email hello@noncelab.com with your registration reference, name, contact email, and reason for cancellation. The Center explains the next steps. Prior approval is not a condition for statutory withdrawal. Bitcoin receiving details are confirmed separately after agreeing the refund method.") ] },
      ...(free ? [] : [originalSection(original, "1-1"), originalSection(original, "3"),
        { ...originalSection(original, "4"), paragraphs: [
          ko ? "환불은 최초 결제한 사토시를 기준으로 비트코인으로 반환합니다. 환불 시점의 원화 시세로 다시 계산하지 않습니다. 전액 환불은 최초 결제 사토시 전액을, 부분 환불은 해당 참가비에 해당하는 최초 결제 사토시를 반환합니다. 법령상 소비자 권리와 배상 의무는 유지됩니다." : "Refunds return the original satoshi amount paid in Bitcoin, without recalculation at the refund-date KRW rate. A full refund returns all originally paid satoshis; a partial refund uses the original satoshis attributable to the refunded registration. Statutory consumer rights and compensation duties remain unaffected.",
          ko ? "비트코인과 라이트닝 거래는 네트워크에서 되돌릴 수 없어 별도 반환 송금을 진행합니다. 센터는 신청과 결제 내역을 확인한 뒤 사토시 금액과 수취 주소 또는 인보이스를 확인합니다. 개인키나 복구 문구를 요구하지 않습니다. 센터의 반환 송금에 필요한 네트워크 수수료를 환불액에서 일방적으로 공제하지 않습니다." : "Bitcoin and Lightning transfers cannot be reversed on the network, so refunds use a separate transfer. The Center verifies the registration and payment, then confirms the satoshi amount and receiving address or invoice. We never request private keys or recovery phrases, and do not unilaterally deduct the Center's transfer fee from the refund.",
          ko ? "법정 청약철회가 적용되는 용역은 법정 청약철회일부터 3영업일 이내에 환급하며 법정 지연배상 의무를 따릅니다. 지연 입금이나 중복, 오송금이 의심되면 추가 송금 전에 신청번호와 결제 정보를 알려 주세요." : "For services covered by statutory withdrawal, payment is refunded within three business days of statutory withdrawal, with statutory delay compensation where applicable. If a payment is late, duplicated, or mistaken, contact the Center with your registration reference and payment details before sending more.",
        ] },
      ]),
      { ...originalSection(original, "5"), paragraphs: (originalSection(original, "5").paragraphs ?? []).map((paragraph) => paragraph.replace("취소, 반품, 환급", "신청 취소와 환급").replace("cancellation, return, or refund", "registration cancellation or refund")) },
    ],
  };
}
