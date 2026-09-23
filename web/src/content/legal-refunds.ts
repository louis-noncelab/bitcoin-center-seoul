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
        heading: "1-1. 환급 권한과 수취 정보 확인",
        paragraphs: ["도용·중복 환급을 방지하기 위해 회사는 주문·결제 내역과 신청자의 환급 권한을 확인하는 데 필요한 최소한의 자료를 요청할 수 있습니다. 주문번호, 결제 식별정보, 주문 시 등록한 연락처를 통한 확인 등으로 가능한지 먼저 검토하며, 불필요한 신분증 사본·주민등록번호·개인키·복구 문구를 요구하지 않습니다.", "환급 수취 주소나 인보이스를 보내기 전에 네트워크·유효기간·금액을 확인해 주세요. 제3자 수취 주소로 변경하는 요청에는 도용 방지를 위한 추가 확인을 할 수 있습니다. 회사는 합의한 정보대로 정확히 송금해야 하며, 이용자가 제공한 수취 정보 오류가 있는 경우의 책임은 각 당사자의 귀책사유와 법령에 따라 정합니다. 이 확인 절차가 법정 청약철회의 효력 발생, 환급 기한 또는 법정 입증책임을 바꾸지는 않습니다."],
      },
      {
        heading: "1-2. 반품 배송지와 연락처",
        bullets: ["수령인: 비트코인 센터 서울", "반품 주소: 04056 서울특별시 마포구 신촌로2안길 30, 2층", "전화: 02-702-1718", "이메일 문의: hello@noncelab.com", "이용 택배사: CJ대한통운"],
        paragraphs: ["반품 수거·발송 방법은 전화나 이메일로 문의해 주세요. 상품과 함께 주문번호를 알려 주시면 확인에 도움이 됩니다. CJ대한통운 이외의 택배사를 이용했다는 이유만으로 법정 청약철회 권리를 제한하지 않습니다."],
      },
      {
        heading: "2. 상품 청약철회와 반품",
        paragraphs: ["통신판매로 구매한 상품은 원칙적으로 계약 내용을 받은 날부터 7일 이내에 청약철회를 요청할 수 있으며, 상품을 더 늦게 받은 경우에는 그날부터 계산합니다. 표시·광고 또는 계약 내용과 다르게 공급된 경우에는 상품을 받은 날부터 3개월 이내이면서 그 사실을 안 날 또는 알 수 있었던 날부터 30일 이내에 요청할 수 있습니다.", "상품의 훼손·사용 등으로 법령상 청약철회가 제한되는 경우에는 해당 법령과 구매 전 고지된 조건을 따릅니다. 내용 확인을 위한 포장 훼손만으로 권리를 제한하지 않습니다. 단순 변심으로 인한 반송비는 관련 법령과 주문 시 표시된 조건에 따라 구매자가 부담할 수 있으며, 하자·오배송으로 인한 반송비는 센터가 부담합니다. 법정 청약철회에 별도 위약금이나 취소 수수료를 부과하지 않습니다."],
      },
      {
        heading: "2-1. 청약철회 제한과 교환",
        paragraphs: ["이용자에게 책임이 있는 상품의 멸실·훼손, 사용 또는 일부 소비로 인한 현저한 가치 감소, 시간이 지나 재판매가 곤란할 정도의 가치 감소, 복제가 가능한 상품의 포장 훼손 등에는 법령상 요건을 충족할 때 청약철회가 제한될 수 있습니다. 법령이 요구하는 제한 사실의 명확한 표시 등 사전 조치를 하지 않았다면 해당 제한을 적용하지 않습니다. 도서라는 이유만으로 반품을 일괄 거절하지 않으며, 내용 확인을 위한 포장 훼손의 예외와 하자·오배송에 관한 권리는 유지됩니다.", "교환을 원하면 같은 문의 창구로 접수해 주세요. 상품 상태·재고와 요청 사유를 확인하여 가능한 방법과 배송비 부담을 안내합니다. 교환 재고가 없거나 합의되지 않더라도 법정 반품·환급 권리는 유지됩니다. 반송지는 위 반품 배송지를 확인해 주세요."],
      },
      {
        heading: "2-2. 반송비와 반환 상품",
        paragraphs: ["단순 변심 반품의 반환에 필요한 배송비는 법령과 구매 전 표시한 조건에 따라 구매자가 부담합니다. 하자·오배송 또는 표시·광고·계약 내용과 다르게 공급된 상품의 반품비는 회사가 부담하며, 회사가 더 유리한 조건을 약속했다면 그 약속을 따릅니다. 재입고비·검수비·행정 처리비를 별도 위약금으로 부과하지 않고, 무료배송 상품이라는 이유만으로 일률적인 왕복 배송비를 청구하지 않습니다.", "반환 대상 상품과 함께 제공된 구성품을 가능한 한 함께 포장하고 반송 중 훼손을 방지해 주세요. 구성품 누락이나 사용 흔적을 확인하면 실제 상태와 법정 철회 제한 요건에 따라 처리하며, 정상적인 내용 확인을 위한 개봉이나 정당한 청약철회만으로 환불을 거절하지 않습니다. 추가 비용을 청구할 경우 실제 발생 금액과 법적·계약상 근거를 안내합니다."],
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
        paragraphs: ["취소·반품·환급에 이견이 있으면 센터로 문의해 주세요. 전화는 02-702-1718, 이메일은 hello@noncelab.com입니다. 1372 소비자상담센터, 한국소비자원(www.kca.go.kr)의 피해구제·분쟁조정 또는 전자문서·전자거래분쟁조정위원회(www.ecmc.or.kr)의 조정을 이용할 수 있습니다. 사전 협의·조정을 거치지 않았다는 이유로 소송 등 법정 권리를 제한하지 않습니다. 준거법과 관할은 이용약관의 해당 조항과 강행 법규를 따릅니다."],
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
        heading: "1-1. Refund entitlement and receiving details",
        paragraphs: ["To prevent impersonation or duplicate refunds, the Company may request only information necessary to verify the order, payment, and applicant's entitlement. It first considers verification through order numbers, payment references, and the contact details supplied with the order. It does not request unnecessary identity-document copies, resident registration numbers, private keys, or recovery phrases.", "Check the network, expiry, and amount before providing a receiving address or invoice. A request to switch to a third-party recipient may require additional anti-fraud verification. The Company must send accurately according to the agreed details; responsibility for incorrect receiving details is determined by each party's fault and applicable law. Verification does not alter the effectiveness of statutory withdrawal, statutory refund deadlines, or statutory burdens of proof."],
      },
      {
        heading: "1-2. Return address and contact details",
        bullets: ["Recipient: Bitcoin Center Seoul", "Return address: 2F, 30 Sinchon-ro 2an-gil, Mapo-gu, Seoul 04056, Republic of Korea", "Telephone: +82 2-702-1718", "Email inquiries: hello@noncelab.com", "Courier: CJ Logistics (CJ대한통운)"],
        paragraphs: ["Contact us by telephone or email for collection and dispatch instructions. Including the order number with your return helps us identify it. Using a courier other than CJ Logistics does not by itself restrict statutory withdrawal rights."],
      },
      {
        heading: "2. Product cancellation and returns",
        paragraphs: ["For a distance purchase, you can generally request withdrawal within seven days of receiving the contract information, or of receiving the product if it arrives later. If it differs from its description, advertisement, or contract, you may request withdrawal within three months of receipt and within 30 days of discovering or being able to discover the difference.", "Statutory restrictions may apply where a product has been damaged or used; those restrictions and any conditions disclosed before purchase govern. Opening packaging simply to inspect the contents does not by itself remove your rights. You may bear return shipping for a change of mind as permitted by law and the disclosed order terms. The Center bears it for a defect or incorrect shipment. There is no additional penalty or cancellation fee for statutory withdrawal."],
      },
      {
        heading: "2-1. Withdrawal restrictions and exchanges",
        paragraphs: ["Where statutory conditions are met, withdrawal may be restricted for destruction or damage attributable to you, a substantial loss of value through use or consumption, a loss of value over time making resale difficult, or damage to the packaging of reproducible goods. Restrictions do not apply where required prior measures, such as clearly displaying the restriction, were not taken. We do not refuse all returns simply because an item is a book. The exception for opening packaging to inspect contents and rights concerning defects or incorrect shipments remain intact.", "Contact the same support channel to request an exchange. We review the item's condition, stock, and reason, then explain available options and shipping costs. Lack of exchange stock or agreement does not remove statutory return or refund rights. Use the return address listed above."],
      },
      {
        heading: "2-2. Return costs and returned items",
        paragraphs: ["For a change-of-mind return, the purchaser bears necessary return shipping under applicable law and conditions disclosed before purchase. The Company bears return costs for defective or incorrect goods or goods supplied differently from their description, advertisement, or contract, and honors any more favorable promise. No separate restocking, inspection, or administrative penalty applies. Free original shipping does not itself justify a flat round-trip shipping charge.", "Where possible, return the item's supplied components together and package them to prevent transit damage. Missing components or signs of use are assessed according to the actual condition and statutory withdrawal restrictions; ordinary inspection or lawful withdrawal alone is not grounds to refuse a refund. Any additional cost is explained with its actual amount and legal or contractual basis."],
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
        paragraphs: ["Contact the Center about a cancellation, return, or refund disagreement at +82 2-702-1718 or hello@noncelab.com. You may also seek advice from Korea's 1372 Consumer Counseling Center, damage relief or mediation from the Korea Consumer Agency (www.kca.go.kr), or mediation from the Electronic Documents and Electronic Commerce Dispute Mediation Committee (www.ecmc.or.kr). Prior negotiation or mediation is not required to exercise statutory remedies such as litigation. Governing law and jurisdiction follow the corresponding Terms of Service provisions and mandatory law."],
      },
    ],
  },
};
