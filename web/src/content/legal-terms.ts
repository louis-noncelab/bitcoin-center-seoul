import type { Locale } from "@/i18n/routing";
import type { LegalDocument } from "./legal-types";

export const termsOfService: Record<Locale, LegalDocument> = {
  ko: {
    title: "이용약관",
    description: "비트코인 센터 서울 웹사이트의 정보, 행사 및 상품 이용에 관한 기본 조건입니다.",
    introduction: "이 약관은 논스랩 주식회사가 운영하는 비트코인 센터 서울 웹사이트에서 제공하는 정보, 센터 상품 주문 및 유료 행사 신청의 이용 조건을 정합니다. 개별 상품·행사에 표시된 조건과 강행 법규가 우선 적용됩니다.",
    sections: [
      {
        heading: "1. 서비스와 외부 링크",
        paragraphs: ["센터는 방문 안내, 행사·전시 정보, 자료 소개, 자체 상품 주문과 유료 행사 신청 기능을 제공합니다. 사이트의 외부 행사 신청·서비스 링크를 통해 다른 운영자 사이트에서 직접 거래하는 경우, 거래 상대방과 조건은 그 사이트에서 확인해 주세요."],
      },
      {
        heading: "2. 주문과 계약",
        paragraphs: ["상품·행사 신청은 비회원으로 진행할 수 있습니다. 이용자는 주문에 필요한 정확한 이름, 연락처와 수령·배송 정보를 제공해야 합니다. 주문 접수만으로 결제가 완료되지는 않으며, 센터가 결제를 확인한 뒤 주문 상태를 안내합니다.", "센터는 재고 부족, 행사 정원·기간 초과, 가격 또는 정보의 명백한 오류 등으로 주문을 이행할 수 없는 경우 사유와 이후 절차를 안내합니다. 이미 결제된 금액의 반환은 환불 및 반품정책과 관련 법령에 따릅니다."],
      },
      {
        heading: "3. 가격과 비트코인 결제",
        paragraphs: ["원화 표시 가격은 주문 화면에서 배송비와 함께 확인할 수 있습니다. 실제 비트코인 결제 금액은 주문 시 표시되는 사토시 견적과 결제 요청에서 확인해야 합니다. 결제 요청의 기한과 수취 정보를 확인하고 송금해 주세요.", "비트코인 및 라이트닝 거래는 전송 후 네트워크에서 되돌릴 수 없습니다. 결제 지연, 중복 송금 또는 주문과 일치하지 않는 송금이 발생했다면 추가로 보내기 전에 센터에 문의해 주세요. 네트워크의 비가역성이 법정 청약철회·환급 권리를 없애지는 않습니다."],
      },
      {
        heading: "4. 상품 배송·수령과 행사 참여",
        paragraphs: ["상품별 배송 가능 지역, 배송비 및 현장 수령 여부는 주문 화면에서 확인합니다. 행사 일정, 장소, 참여 조건과 좌석 수는 해당 행사 안내를 따릅니다. 센터가 행사를 취소하거나 주요 내용을 바꾸는 경우 신청자에게 가능한 방법으로 알리고 관련 법령과 안내된 조건에 따라 처리합니다."],
      },
      {
        heading: "5. 취소·반품·환불",
        paragraphs: ["결제 전 주문은 주문 화면에서 가능한 상태일 때 직접 취소할 수 있습니다. 결제 요청이 발행되었거나 결제가 진행 중이면 센터에 문의해 주세요. 결제 후 상품 반품과 행사 취소는 환불 및 반품정책과 관련 법령에 따릅니다.", "환불 금액은 최초 결제한 사토시를 기준으로 정하며, 환불 시점의 원화 시세로 재환산하지 않습니다. 전액 환불은 최초 결제 사토시 전액을, 부분 환불은 환불 대상에 해당하는 최초 결제 사토시를 비트코인으로 반환합니다. 법령이 보장하는 권리는 유지됩니다."],
      },
      {
        heading: "6. 콘텐츠와 지식재산권",
        paragraphs: ["사이트에서 센터가 직접 제작하거나 적법하게 권리를 취득한 글, 사진, 영상, 디자인 및 기타 콘텐츠에 대한 권리는 센터 또는 해당 권리자에게 있습니다. 게시되었다는 이유만으로 제3자의 도서, 표지, 미술작품, 상품, 사진, 후기, 상호 또는 상표에 관한 권리가 센터로 이전되지 않습니다.", "권리자의 허락 또는 관련 법령에서 허용하는 경우를 제외하고 사이트 콘텐츠를 복제·재게시·배포·공중송신하거나 상업적으로 이용해서는 안 됩니다. 상품 구매나 행사 참가로 콘텐츠의 저작권 또는 상표권이 이전되지는 않습니다.", "센터가 소개하는 외부 후기·게시물의 글과 사진에 관한 권리는 해당 권리자에게 있습니다. 원문 링크나 작성자 표시는 재이용 허락을 뜻하지 않습니다. 센터가 별도 허락을 받은 경우에는 그 범위에서만 게시합니다.", "협업 제안이나 문의를 보내도 제안서·아이디어·자료의 권리는 자동으로 이전되지 않습니다. 센터는 검토와 답변에 필요한 범위에서만 이용하며, 공개·홍보·사업 이용이나 공동 제작물의 권리는 별도로 합의합니다. 비밀 자료는 발송 전에 비밀유지 조건을 협의해 주세요."],
      },
      {
        heading: "7. 변경과 문의",
        paragraphs: ["센터는 관련 법령을 준수하며 서비스와 약관을 변경할 수 있습니다. 이용자에게 영향을 주는 변경은 시행 전에 사이트에서 알립니다. 주문·행사·약관에 관한 문의는 hello@noncelab.com 또는 02-702-1718로 보내 주세요."],
      },
    ],
  },
  en: {
    title: "Terms of service",
    description: "Basic terms for information, events, and purchases on the Bitcoin Center Seoul website.",
    introduction: "These terms govern information, Center shop orders, and paid event registration on the Bitcoin Center Seoul website operated by Nonce Lab Inc. Terms shown for a particular item or event and mandatory law take precedence.",
    sections: [
      {
        heading: "1. Services and external links",
        paragraphs: ["The Center provides visitor information, events and exhibitions, resource listings, orders for its own products, and registration for paid events. If you transact directly on another operator's site through an external event-registration or service link, check that operator and its terms there."],
      },
      {
        heading: "2. Orders and contracts",
        paragraphs: ["You may order without an account. Provide accurate name, contact, collection, and shipping details needed for the order. Placing an order does not itself complete payment; the Center confirms payment before updating the order status.", "If the Center cannot fulfill an order because of insufficient stock, an event's capacity or date, or an obvious price or listing error, it will explain the reason and next steps. Any payment already received will be handled under the Refund and Return Policy and applicable law."],
      },
      {
        heading: "3. Prices and Bitcoin payment",
        paragraphs: ["The checkout shows prices in KRW and applicable shipping charges. Check the satoshi quote and payment request for the Bitcoin amount to pay. Confirm the request's deadline and recipient before sending a payment.", "Bitcoin and Lightning transfers cannot be reversed on the network after they are sent. If a payment is late, duplicated, or does not match your order, contact the Center before sending another. Network irreversibility does not remove statutory cancellation or refund rights."],
      },
      {
        heading: "4. Delivery, collection, and events",
        paragraphs: ["Available delivery regions, shipping charges, and pickup options are shown at checkout. The event listing provides its schedule, venue, participation terms, and capacity. If the Center cancels an event or changes a material term, it will notify registrants where possible and handle the change under applicable law and the displayed terms."],
      },
      {
        heading: "5. Cancellation, returns, and refunds",
        paragraphs: ["You can cancel an unpaid order on its order page while that option is available. If a payment request has been issued or payment is in progress, contact the Center. Paid-order returns and event cancellations are governed by the Refund and Return Policy and applicable law.", "Refunds use the original satoshi amount paid, without recalculation at the KRW exchange rate on the refund date. A full refund returns all originally paid satoshis in Bitcoin; a partial refund returns the original satoshis attributable to the refunded items or services. Statutory rights remain unaffected."],
      },
      {
        heading: "6. Content and intellectual property",
        paragraphs: ["Rights in text, photographs, video, designs, and other content that the Center creates or lawfully obtains belong to the Center or the relevant rightsholder. Posting an item on this site does not transfer to the Center any rights in third-party books, covers, artwork, products, photographs, visitor stories, trade names, or trademarks.", "Except with the rightsholder's permission or as permitted by law, visitors must not reproduce, repost, distribute, transmit to the public, or commercially exploit site content. Buying a product or attending an event does not transfer copyright or trademark rights in its content.", "Rights in external visitor stories and their images belong to their respective rightsholders. A link to the original or author credit does not grant permission to reuse that material. Where the Center has obtained separate permission, it may display the story or image within the scope of that permission.", "Sending a collaboration proposal or inquiry does not automatically transfer rights in the proposal, idea, or materials. The Center may use them only to review and respond. Publicity, business use, or rights in jointly created work require a separate agreement. Please agree on confidentiality terms before sending confidential material."],
      },
      {
        heading: "7. Changes and contact",
        paragraphs: ["The Center may change its services and terms in compliance with applicable law. Changes affecting visitors will be announced on the site before they take effect. For questions about an order, event, or these terms, email hello@noncelab.com or call +82 2-702-1718."],
      },
    ],
  },
};
