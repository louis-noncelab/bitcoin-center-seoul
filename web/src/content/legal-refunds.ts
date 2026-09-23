import type { Locale } from "@/i18n/routing";
import type { LegalDocument } from "./legal-types";

export const refundPolicy: Record<Locale, LegalDocument> = {
  ko: {
    title: "환불 및 반품정책",
    description: "센터 상품의 반품과 유료 행사 취소·환불 신청 방법을 안내합니다.",
    introduction: "이 정책은 비트코인 센터 서울이 직접 판매하는 상품과 유료 행사에 적용됩니다. 사이트에서 연결된 외부 운영자와 직접 체결한 거래는 해당 운영자의 정책을 확인해 주세요. 법령이 보장하는 소비자 권리는 이 정책보다 우선합니다.",
    sections: [
      {
        heading: "1. 신청 방법",
        paragraphs: ["주문번호, 구매자 이름, 연락 가능한 이메일, 취소·반품 사유를 hello@noncelab.com으로 보내 주세요. 상품 하자나 오배송은 사진을 함께 보내면 확인에 도움이 됩니다. 센터가 반송 방법과 다음 절차를 안내합니다. 센터의 사전 승인은 법정 청약철회의 요건이 아닙니다. 비트코인 수취 정보는 환급 방법을 합의한 뒤 별도로 확인합니다."],
      },
      {
        heading: "2. 상품 청약철회와 반품",
        paragraphs: ["통신판매로 구매한 상품은 원칙적으로 계약 내용을 받은 날부터 7일 이내에 청약철회를 요청할 수 있으며, 상품을 더 늦게 받은 경우에는 그날부터 계산합니다. 표시·광고 또는 계약 내용과 다르게 공급된 경우에는 상품을 받은 날부터 3개월 이내이면서 그 사실을 안 날 또는 알 수 있었던 날부터 30일 이내에 요청할 수 있습니다.", "상품의 훼손·사용 등으로 법령상 청약철회가 제한되는 경우에는 해당 법령과 구매 전 고지된 조건을 따릅니다. 내용 확인을 위한 포장 훼손만으로 권리를 제한하지 않습니다. 단순 변심으로 인한 반송비는 관련 법령과 주문 시 표시된 조건에 따라 구매자가 부담할 수 있으며, 하자·오배송으로 인한 반송비는 센터가 부담합니다. 법정 청약철회에 별도 위약금이나 취소 수수료를 부과하지 않습니다."],
      },
      {
        heading: "3. 유료 행사",
        paragraphs: ["행사 시작 7일 전까지 취소하면 전액 환불합니다. 그 이후의 취소나 불참은 법정 청약철회 등 환급 권리가 적용되지 않고, 신청·결제 전에 고지한 환불 제한이 법령상 유효한 경우에만 환불이 제한됩니다. 행사별 안내가 소비자에게 더 유리하면 그 조건을 적용합니다. 이 기준으로 법정 청약철회나 계약 해제·해지 권리를 제한하지 않습니다.", "센터 사정으로 행사가 취소되면 전액 환불합니다. 일정·장소 변경으로 참가가 어려운 경우에도 전액 환불하며, 원활한 처리를 위해 변경 안내 후 3일 이내에 알려 주세요. 이 요청 기한이 지났다는 이유만으로 법령상 환급 권리를 제한하지 않습니다."],
      },
      {
        heading: "4. 비트코인 결제의 반환",
        paragraphs: ["환불은 최초 결제한 사토시를 기준으로 비트코인으로 반환하며, 원화나 다른 통화로 환전하지 않습니다. 원화 표시 상품도 환불 시점의 시세로 재환산하지 않습니다. 전액 환불은 최초 결제 사토시 전액, 부분 환불은 환불 대상 상품·서비스에 해당하는 최초 결제 사토시를 기준으로 합니다. 적용 법령이 보장하는 소비자 권리와 배상 의무는 유지됩니다.", "비트코인·라이트닝 송금은 기술적으로 취소할 수 없으므로 별도 반환 거래를 진행합니다. 센터는 주문 확인 후 반환 사토시와 비트코인 수취 주소 또는 라이트닝 인보이스를 확인하며, 개인키나 복구 문구를 요구하지 않습니다. 센터가 부담하는 반환 거래의 네트워크 수수료를 환불금에서 일방적으로 공제하지 않습니다. 구매자가 부담하는 반송비 등 적법한 비용이 있으면 근거와 금액을 별도로 안내하고 정산 방법을 확인합니다.", "법정 청약철회의 환급은 상품을 반환받은 날부터, 아직 공급하지 않은 상품이나 해당 용역은 법정 청약철회일부터 3영업일 이내에 처리합니다. 검수 완료를 이유로 이 기한을 늦추지 않으며, 지연 시 법정 지연배상금을 적용합니다. 결제가 늦게 도착했거나 중복 결제·과오납이 의심되면 추가 송금 전에 주문번호와 결제 내역을 첨부해 문의해 주세요."],
      },
      {
        heading: "5. 분쟁과 문의",
        paragraphs: ["취소·반품·환급에 이견이 있으면 먼저 센터로 문의해 주세요. 관련 법령에 따른 소비자 분쟁 해결 절차를 이용할 권리는 유지됩니다. 전화는 02-702-1718, 이메일은 hello@noncelab.com입니다."],
      },
    ],
  },
  en: {
    title: "Refund and return policy",
    description: "How to request a return of Center products or a cancellation and refund for paid events.",
    introduction: "This policy covers products and paid events sold directly by Bitcoin Center Seoul. For a transaction made directly with an external operator through a link on this site, check that operator's policy. Consumer rights under applicable law take precedence.",
    sections: [
      {
        heading: "1. How to request help",
        paragraphs: ["Email hello@noncelab.com with your order number, purchaser name, contact email, and reason for the request. Photographs can help us review a defect or incorrect shipment. The Center will explain the return method and next steps. The Center's prior approval is not a condition for statutory withdrawal. Bitcoin receiving details will be confirmed separately after agreeing how a refund will be made."],
      },
      {
        heading: "2. Product cancellation and returns",
        paragraphs: ["For a distance purchase, you can generally request withdrawal within seven days of receiving the contract information, or of receiving the product if it arrives later. If it differs from its description, advertisement, or contract, you may request withdrawal within three months of receipt and within 30 days of discovering or being able to discover the difference.", "Statutory restrictions may apply where a product has been damaged or used; those restrictions and any conditions disclosed before purchase govern. Opening packaging simply to inspect the contents does not by itself remove your rights. You may bear return shipping for a change of mind as permitted by law and the disclosed order terms. The Center bears it for a defect or incorrect shipment. There is no additional penalty or cancellation fee for statutory withdrawal."],
      },
      {
        heading: "3. Paid events",
        paragraphs: ["Cancellation at least seven days before an event receives a full refund. For later cancellations or non-attendance, a refund may be restricted only where no statutory withdrawal or other refund right applies and the restriction disclosed before registration and payment is lawful. More favorable terms displayed for an event apply. This rule does not restrict statutory withdrawal or contract termination rights.", "If the Center cancels an event, you receive a full refund. You also receive a full refund if a change of date or venue prevents attendance. Please tell us within three days of the change notice to help us process your request; missing this request period does not remove a statutory refund right."],
      },
      {
        heading: "4. Returning a Bitcoin payment",
        paragraphs: ["Refunds are returned in Bitcoin using the original satoshi amount paid, without conversion into KRW or another currency. Even for KRW-priced products, we do not recalculate at the exchange rate on the refund date. A full refund returns all originally paid satoshis; a partial refund uses the original satoshis attributable to the refunded products or services. Consumer rights and compensation required by applicable law remain unaffected.", "Bitcoin and Lightning transfers cannot be technically reversed, so we make a separate return transfer. After verifying the order, the Center confirms the satoshi amount and your Bitcoin receiving address or Lightning invoice. We never ask for private keys or recovery phrases. We do not unilaterally deduct the network fee for the Center's return transfer from your refund. Any lawful cost payable by you, such as return shipping, is explained separately with its basis and amount, and the settlement method is confirmed with you.", "For statutory withdrawal, a refund is due within three business days after returned goods are received, or from the statutory withdrawal date for unsupplied goods and applicable services. Inspection does not extend this deadline, and statutory delay compensation applies. If a payment arrives late or you suspect a duplicate or mistaken payment, contact us with the order number and payment details before sending more."],
      },
      {
        heading: "5. Disputes and contact",
        paragraphs: ["Please contact the Center first if you disagree with a cancellation, return, or refund decision. Your right to use consumer dispute-resolution procedures remains available. Call +82 2-702-1718 or email hello@noncelab.com."],
      },
    ],
  },
};
