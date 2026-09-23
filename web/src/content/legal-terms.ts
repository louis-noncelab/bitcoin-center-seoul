import type { Locale } from "@/i18n/routing";
import type { LegalDocument } from "./legal-types";

export const termsOfService: Record<Locale, LegalDocument> = {
  ko: {
    title: "이용약관",
    description: "비트코인 센터 서울 웹사이트의 정보, 행사 및 상품 이용에 관한 기본 조건입니다.",
    introduction: "이 약관은 논스랩 주식회사(이하 ‘회사’)가 운영하는 비트코인 센터 서울(이하 ‘센터’) 웹사이트에서 제공하는 정보, 센터 상품 주문 및 행사 신청의 이용 조건을 정합니다. ‘이용자’는 사이트에 접속하거나 이 서비스를 이용하는 사람을 뜻합니다. 개별 상품·행사에 표시된 조건도 계약의 일부가 되며, 강행 법규가 우선 적용됩니다. 사업자정보와 연락처는 사이트 하단의 사업자정보에서 확인할 수 있습니다.",
    sections: [
      {
        heading: "1. 서비스와 외부 링크",
        paragraphs: ["센터는 방문 안내, 행사·전시 정보, 자료 소개, 자체 상품 주문과 유료 행사 신청 기능을 제공합니다. 사이트의 외부 행사 신청·서비스 링크를 통해 다른 운영자 사이트에서 직접 거래하는 경우, 거래 상대방과 조건은 그 사이트에서 확인해 주세요.", "센터가 계약 당사자가 아닌 외부 운영자와의 거래는 해당 운영자가 이행하며, 단순한 링크·정보 소개가 회사의 이행 보증을 뜻하지는 않습니다. 다만 회사가 직접 판매하는 상품·행사의 결제를 Zaprite 등 외부 화면에서 진행하는 경우에는 여전히 회사와의 거래입니다. 회사 자신의 표시·광고나 행위에 따른 법정 책임은 유지됩니다."],
      },
      {
        heading: "2. 주문과 계약",
        paragraphs: ["상품·행사 신청은 비회원으로 진행할 수 있습니다. 이용자는 주문에 필요한 정확한 이름, 연락처와 수령·배송 정보를 제공해야 합니다. 주문 접수나 결제 요청 발행만으로 결제·구매가 확정되지는 않습니다. 센터가 결제를 확인하고 주문 또는 참가 확정 의사를 주문 확인 화면이나 이메일로 이용자에게 통지한 때에 계약이 성립합니다. 단순 접수·입금 확인 중·추가 검토 안내는 확정 통지가 아닙니다.", "센터는 재고 부족, 행사 정원·기간 초과, 가격 또는 정보의 명백한 오류 등으로 주문을 이행할 수 없는 경우 사유와 이후 절차를 안내합니다. 이미 결제된 금액의 반환은 환불 및 반품정책과 관련 법령에 따릅니다. 이 조항이 성립한 계약을 임의로 취소하거나 소비자의 권리를 제한하는 근거가 되지는 않습니다."],
      },
      {
        heading: "2-1. 주문 확인과 부정 거래 대응",
        paragraphs: ["도용, 허위 주문, 결제 위·변조 또는 재고·좌석을 부당하게 점유하는 반복 주문의 객관적 정황이 있는 경우, 회사는 계약 성립 전 필요한 최소 범위의 확인 자료를 요청하고 확인에 필요한 합리적 기간 동안 승낙을 보류하거나 정당한 사유를 안내하여 주문을 거절할 수 있습니다. 법정 처리 기한을 넘겨 확인을 지연하거나 정상적인 청약철회 이력만으로 부정 주문으로 취급하지 않습니다.", "이미 성립한 계약의 해제·취소는 법령상 요건에 따라 처리합니다. 가격이나 환율 계산의 명백한 오류가 확인되더라도 추가 금액을 동의 없이 청구하지 않으며, 정정 내용과 가능한 처리 방법을 안내합니다. 법률상 취소·해제가 허용되어 이미 받은 대금을 반환하는 경우에는 환불정책과 법정 기한을 따릅니다."],
      },
      {
        heading: "3. 가격과 비트코인 결제",
        paragraphs: ["원화 표시 가격은 주문 화면에서 배송비와 함께 확인할 수 있습니다. 실제 비트코인 결제 금액은 주문 시 표시되는 사토시 견적과 결제 요청에서 확인해야 합니다. 결제 요청의 기한과 수취 정보를 확인하고 송금해 주세요.", "비트코인 및 라이트닝 거래는 전송 후 네트워크에서 되돌릴 수 없습니다. 결제 지연, 중복 송금 또는 주문과 일치하지 않는 송금이 발생했다면 추가로 보내기 전에 센터에 문의해 주세요. 네트워크의 비가역성이 법정 청약철회·환급 권리를 없애지는 않습니다."],
      },
      {
        heading: "3-1. 결제 요청과 지갑 확인",
        paragraphs: ["송금 전 주문별 결제 금액, 지원 네트워크, 수취 주소·인보이스와 유효기간을 확인해야 합니다. 만료된 견적은 새로 발급된 견적과 다를 수 있으며, 만료·취소 후 송금이나 부족·초과·중복 송금은 주문을 자동 확정하거나 기존 가격·재고·좌석을 보장하지 않습니다. 회사는 실제 수취 여부를 확인하여 추가 이행 합의 또는 적법한 반환 절차를 안내합니다.", "이용자가 회사가 지정하지 않은 주소·네트워크로 보내거나 회사가 관리하지 않는 지갑의 접근권한을 잃은 경우, 회사가 해당 자산을 회수할 수 있다고 보장하지 않습니다. 회사의 잘못된 안내·보안상 귀책사유가 있는 경우의 책임은 유지됩니다. 송금 지갑이나 네트워크가 부과하는 수수료는 결제 전 해당 지갑에서 확인해 주세요."],
      },
      {
        heading: "3-2. 거래 증빙",
        paragraphs: ["거래 증빙이 필요하면 주문번호와 함께 센터에 문의해 주세요. 세금계산서·계산서·현금영수증 등 증빙의 발급 여부와 종류는 거래 내용, 공급받는 자 및 관련 세법에 따라 정합니다. 법령상 발급 의무가 있는 경우에는 정해진 절차와 기한을 따릅니다.", "주문 확인 화면이나 결제서비스의 결제 확인서는 그 자체로 세금계산서·계산서 또는 현금영수증을 대신하지 않습니다. 비트코인으로 결제했다는 사유만으로 모든 거래에 같은 세금 처리나 증빙이 적용되는 것은 아닙니다."],
      },
      {
        heading: "4. 상품 배송·수령과 행사 참여",
        paragraphs: ["상품별 배송 가능 지역, 배송비 및 현장 수령 여부는 주문 화면에서 확인합니다. 공급 시기를 별도로 약정한 경우 그 일정을 따르며, 별도 약정이 없으면 청약일부터 7일 이내, 선지급 주문은 대금을 받은 날부터 3영업일 이내에 공급에 필요한 조치를 합니다. 이는 모든 배송이 그 기간 안에 도착한다는 보장은 아닙니다. 공급이 어렵거나 지연되면 사유와 처리 방법을 안내하고 법정 환급 의무를 이행합니다.", "배송 중 분실·파손이나 오배송은 센터에 접수하면 배송 경위와 책임을 확인하여 재배송·교환·환불 등 법령에 따른 조치를 안내합니다. 택배사에 직접 청구해야만 구제받을 수 있는 것은 아닙니다. 이용자의 잘못된 주소나 부재로 반송·재배송이 필요한 경우 이용자에게 책임이 있는 범위에서 발생한 실제 비용과 근거를 안내합니다. 현장 수령은 주문 안내의 수령 장소·일정과 확인 방법을 따릅니다.", "행사 일정, 장소, 참여 조건과 좌석 수는 해당 행사 안내를 따릅니다. 센터가 행사를 취소하거나 주요 내용을 바꾸는 경우 신청자에게 가능한 방법으로 알리고 관련 법령과 안내된 조건에 따라 처리합니다."],
      },
      {
        heading: "5. 취소·반품·환불",
        paragraphs: ["결제 전 주문은 주문 화면에서 가능한 상태일 때 직접 취소할 수 있습니다. 결제 요청이 발행되었거나 결제가 진행 중이면 센터에 문의해 주세요. 결제 후 상품 반품과 행사 취소는 환불 및 반품정책과 관련 법령에 따릅니다.", "환불 금액은 최초 결제한 사토시를 기준으로 정하며, 환불 시점의 원화 시세로 재환산하지 않습니다. 전액 환불은 최초 결제 사토시 전액을, 부분 환불은 환불 대상에 해당하는 최초 결제 사토시를 비트코인으로 반환합니다. 법령이 보장하는 권리는 유지됩니다."],
      },
      {
        heading: "6. 콘텐츠와 지식재산권",
        paragraphs: ["사이트에서 센터가 직접 제작하거나 적법하게 권리를 취득한 글, 사진, 영상, 디자인 및 기타 콘텐츠에 대한 권리는 센터 또는 해당 권리자에게 있습니다. 게시되었다는 이유만으로 제3자의 도서, 표지, 미술작품, 상품, 사진, 후기, 상호 또는 상표에 관한 권리가 센터로 이전되지 않습니다.", "권리자의 허락 또는 관련 법령에서 허용하는 경우를 제외하고 사이트의 저작권 등 법률상 보호받는 콘텐츠를 복제·재게시·배포·공중송신하거나 상업적으로 이용해서는 안 됩니다. 상품 구매나 행사 참가로 콘텐츠의 저작권 또는 상표권이 이전되지는 않습니다.", "센터가 소개하는 외부 후기·게시물의 글과 사진에 관한 권리는 해당 권리자에게 있습니다. 원문 링크나 작성자 표시는 재이용 허락을 뜻하지 않습니다. 센터가 별도 허락을 받은 경우에는 그 범위에서만 게시합니다.", "협업 제안이나 문의를 보내도 제안서·아이디어·자료의 권리는 자동으로 이전되지 않습니다. 센터는 검토와 답변에 필요한 범위에서만 이용하며, 공개·홍보·사업 이용이나 공동 제작물의 권리는 별도로 합의합니다. 비밀 자료는 발송 전에 비밀유지 조건을 협의해 주세요."],
      },
      {
        heading: "7. 이용자의 의무와 이용 제한",
        paragraphs: ["이용자는 타인의 정보나 결제수단 도용, 허위 주문, 부정 결제, 타인의 권리 침해, 시스템의 무단 접근이나 보안 우회, 서비스 운영을 방해하는 악성 요청을 해서는 안 됩니다. 주문 확인 링크·코드와 행사 참가권은 안전하게 관리하고, 유출이나 부정 사용이 의심되면 센터에 알려 주세요.", "센터는 위법행위나 보안 위협에 대응하기 위해 필요한 범위에서 이용을 제한할 수 있습니다. 가능한 경우 사유와 이의 제기 방법을 안내하며, 긴급한 보호 조치가 필요하면 우선 조치한 후 안내합니다. 이용 제한만으로 이미 결제된 주문의 이행·환급 의무나 이용자의 법정 권리가 없어지지는 않습니다.", "미성년자가 법정대리인의 동의가 필요한 계약을 체결할 때에는 그 동의를 받아야 합니다. 필요한 동의 없이 체결된 계약은 미성년자 또는 법정대리인이 관련 법령에 따라 취소할 수 있습니다. 행사 참여 시에는 사전에 안내된 연령·안전·시설 이용 규칙을 지켜 주세요."],
      },
      {
        heading: "7-1. 행사 안전과 콘텐츠 보호",
        paragraphs: ["폭력·위협·괴롭힘, 다른 참가자의 권리 침해, 반복적인 진행 방해 또는 합리적인 안전 지시 위반이 있는 경우 센터는 안전 확보에 필요한 범위에서 경고, 입장 제한 또는 퇴장을 요청할 수 있습니다. 긴급한 위험에는 사전 경고 없이 대응할 수 있습니다. 참가비 처리는 위반 경위, 실제 제공된 서비스와 관련 법령에 따라 정하며, 퇴장만으로 참가비 전액을 몰취하지 않습니다.", "별도 허락이나 법령상 근거 없이 강연·교재를 녹음·촬영·재배포하거나 다른 참가자의 모습을 공개해서는 안 됩니다. 이용자는 개인 소지품과 자신의 지갑 접근정보를 관리해야 하며, 센터가 별도로 보관을 인수하지 않은 물품의 보관 서비스를 제공하는 것은 아닙니다. 회사의 안전관리·보관상 과실 등 법정 책임은 별도로 판단합니다. 센터가 참가자의 모습을 촬영·공개하는 경우에도 별도의 안내와 필요한 동의 또는 법적 근거에 따릅니다."],
      },
      {
        heading: "8. 주문 확인과 안내",
        paragraphs: ["주문 내용·결제 상태·수령 방법은 주문 확인 화면에서 확인할 수 있습니다. 입력 오류를 발견하면 해당 화면에서 가능한 범위에서 수정·취소하거나 센터에 연락해 주세요. 이미 발송되었거나 서비스가 제공된 경우에는 관련 법령과 환불 및 반품정책에 따라 처리합니다.", "센터는 주문 시 제공된 이메일과 연락처 또는 주문 확인 화면으로 결제·배송·행사 변경 등 계약 이행에 필요한 사항을 안내합니다. 전체 이용자에게 알릴 사항은 사이트에 게시하되, 개별 주문에 중대한 영향을 주는 사항은 제공된 연락처로도 안내합니다. 연락처 오류로 안내를 받지 못한 경우 센터에 확인을 요청할 수 있으며, 이것만으로 법정 권리가 제한되지는 않습니다."],
      },
      {
        heading: "9. 서비스 변경·중단",
        paragraphs: ["센터는 점검·교체, 장애, 통신 또는 결제 서비스 중단, 천재지변 등으로 서비스의 일부를 일시 중단할 수 있습니다. 예정된 중단은 사전에 알리고, 긴급한 장애 등 사전 안내가 어려우면 가능한 때에 사유와 대응 상황을 안내합니다.", "서비스가 중단되더라도 이미 성립한 주문을 확인하고 이행·환불 등 필요한 조치를 진행합니다. 사업 종료 등으로 계약을 이행할 수 없으면 이용자에게 알리고 관련 법령에 따라 처리합니다. 센터의 귀책사유에 따른 책임을 이 조항으로 면제하지 않습니다."],
      },
      {
        heading: "10. 개인정보 보호",
        paragraphs: ["센터는 주문·결제·배송·행사와 문의 처리에 필요한 개인정보를 관련 법령과 별도 개인정보 처리방침에 따라 처리합니다. 수집 항목, 목적, 보유기간, 외부 서비스 이용과 권리 행사 방법은 사이트 하단의 개인정보 처리방침에서 확인할 수 있습니다. 약관에 동의했다는 이유만으로 별도 동의가 필요한 개인정보 처리에 동의한 것으로 보지 않습니다."],
      },
      {
        heading: "11. 정보의 성격과 책임",
        paragraphs: ["센터의 도서·전시·교육·행사·게시물은 학습과 정보 제공을 위한 것으로, 별도로 명시하여 계약한 경우를 제외하면 개인의 상황에 맞춘 투자·법률·세무 자문이 아닙니다. 비트코인 가격이나 투자 수익을 보장하지 않습니다.", "회사의 채무불이행에 따른 손해배상은 상당인과관계가 있는 통상손해를 범위로 하며, 특별한 사정으로 인한 손해는 회사가 그 사정을 알았거나 알 수 있었을 때에 관련 법령에 따라 배상합니다. 법령에 별도 규정이 있는 경우 그 규정을 따릅니다. 기대한 투자 수익, 시세차익이나 사업 기회가 실현되지 않았다는 사실만으로 배상책임이 발생하는 것은 아닙니다.", "천재지변이나 회사의 통제 범위 밖의 네트워크 장애 등으로 고의·과실 없이 이행이 불가능해진 경우에는 법령이 인정하는 범위에서 손해배상책임을 부담하지 않습니다. 외부 결제·배송 업체를 이용한다는 이유만으로 회사나 이행보조자의 귀책사유를 면책하지 않으며, 이행 불능 시 대금 반환 등 법정 의무는 유지됩니다.", "손해의 발생·확대에 이용자의 잘못된 주소 입력, 지갑·주문 접근정보 관리 소홀 등 과실이 기여한 경우에는 책임과 배상액을 정할 때 법령에 따라 이를 고려합니다. 회사나 이행보조자의 고의·중대한 과실, 생명·신체 침해, 개인정보 보호 등 강행 법규상 책임을 배제하지 않으며, 법정 입증책임을 이용자에게 전가하지 않습니다."],
      },
      {
        heading: "12. 약관의 게시와 변경",
        paragraphs: ["센터는 이용자가 약관을 확인할 수 있도록 사이트에 게시합니다. 관련 법령에 위배되지 않는 범위에서 약관을 바꾸는 경우 변경 내용·이유·시행일을 시행일 최소 7일 전에 공지하며, 이용자에게 불리하거나 중요한 변경은 최소 30일 전에 공지합니다. 영향을 받는 기존 계약의 이용자에게는 제공된 연락처를 통해 개별 안내합니다.", "이미 체결된 계약에는 원칙적으로 체결 당시 약관을 적용하며, 법령상 근거 또는 이용자와의 적법한 합의 없이 불리한 변경을 소급 적용하지 않습니다. 사이트를 계속 이용하거나 이의를 제기하지 않았다는 이유만으로 별도의 동의가 필요한 변경에 동의한 것으로 보지 않습니다. 변경에 관한 문의나 이의는 hello@noncelab.com 또는 02-702-1718로 접수할 수 있습니다."],
      },
      {
        heading: "13. 분쟁 해결과 관할 법원",
        paragraphs: ["주문·결제·배송·행사·환불에 관한 불만이나 분쟁은 hello@noncelab.com 또는 02-702-1718로 접수할 수 있습니다. 센터는 접수 내용을 확인하여 해결 방법을 안내하고, 처리가 지연되면 사유와 처리 일정을 안내합니다.", "이용자는 1372 소비자상담센터의 상담, 한국소비자원(www.kca.go.kr)의 피해구제·분쟁조정 또는 전자문서·전자거래분쟁조정위원회(www.ecmc.or.kr)의 조정을 신청할 수 있습니다. 센터와의 사전 협의나 조정 신청이 소송 등 법정 권리 행사의 필수 조건은 아닙니다.", "소송의 관할은 「전자상거래 등에서의 소비자보호에 관한 법률」 제36조 등 강행 규정을 우선 적용합니다. 해당 규정이 적용되는 거래의 소는 소 제기 당시 소비자의 주소, 주소가 없으면 거소를 관할하는 지방법원의 전속관할로 하며, 주소·거소가 분명하지 않은 경우 등은 관련 법령을 따릅니다. 그 밖의 관할은 「민사소송법」과 「국제사법」 등 관련 법령에 따릅니다."],
      },
      {
        heading: "14. 준거법과 약관의 해석",
        paragraphs: ["이 약관과 센터와의 거래에는 대한민국 법률을 적용합니다. 다만 준거법의 선택으로 「국제사법」 등 적용 법령에 따라 소비자의 일상거소지 국가의 강행 규정이 보장하는 보호를 박탈하지 않습니다.", "이 약관에서 정하지 않은 사항은 관련 법령과 유효한 개별 약정에 따릅니다. 일부 조항이 무효여도 나머지 조항은 관련 법령이 허용하는 범위에서 효력을 유지하며, 약관의 뜻이 명확하지 않은 경우 이용자에게 유리하게 해석합니다."],
      },
    ],
  },
  en: {
    title: "Terms of service",
    description: "Basic terms for information, events, and purchases on the Bitcoin Center Seoul website.",
    introduction: "These terms govern information, shop orders, and event registration on the Bitcoin Center Seoul (the ‘Center’) website operated by Nonce Lab Inc. (the ‘Company’). A ‘user’ is anyone accessing the site or using these services. Disclosed item or event terms also form part of the contract, subject to mandatory law. Operator details and contact information appear in Business Information in the site footer.",
    sections: [
      {
        heading: "1. Services and external links",
        paragraphs: ["The Center provides visitor information, events and exhibitions, resource listings, orders for its own products, and registration for paid events. If you transact directly on another operator's site through an external event-registration or service link, check that operator and its terms there.", "Where the Center is not a contracting party, the external operator is responsible for performing its transaction. A link or informational listing alone is not a Company guarantee of performance. However, paying for the Company's own products or events through Zaprite or another external payment page remains a transaction with the Company. Statutory responsibility for the Company's own representations, advertising, and conduct remains unaffected."],
      },
      {
        heading: "2. Orders and contracts",
        paragraphs: ["You may order without an account. Provide accurate name, contact, collection, and shipping details needed for the order. Receiving an order or issuing a payment request does not itself confirm payment or purchase. The contract forms when, after verifying payment, the Center communicates order or attendance acceptance to you through the order page or email. An acknowledgment of receipt, pending payment verification, or further review is not acceptance.", "If the Center cannot fulfill an order because of insufficient stock, an event's capacity or date, or an obvious price or listing error, it will explain the reason and next steps. Any payment already received will be handled under the Refund and Return Policy and applicable law. This does not permit arbitrary cancellation of a concluded contract or restriction of consumer rights."],
      },
      {
        heading: "2-1. Order verification and fraud prevention",
        paragraphs: ["Where objective circumstances indicate impersonation, fraudulent orders, falsified payment, or repeated orders improperly tying up stock or seats, the Company may request the minimum verification information necessary. Before a contract forms, it may withhold acceptance for a reasonable verification period or decline the order with a justified explanation. Verification must not exceed statutory handling deadlines, and a history of lawful withdrawals alone is not treated as fraud.", "Rescission or cancellation of an existing contract requires the grounds provided by law. Even if an obvious price or exchange-rate calculation error is found, no additional amount is charged without agreement. The Company explains the correction and available next steps. If lawful cancellation or rescission requires returning a payment, the Refund and Return Policy and statutory deadlines apply."],
      },
      {
        heading: "3. Prices and Bitcoin payment",
        paragraphs: ["The checkout shows prices in KRW and applicable shipping charges. Check the satoshi quote and payment request for the Bitcoin amount to pay. Confirm the request's deadline and recipient before sending a payment.", "Bitcoin and Lightning transfers cannot be reversed on the network after they are sent. If a payment is late, duplicated, or does not match your order, contact the Center before sending another. Network irreversibility does not remove statutory cancellation or refund rights."],
      },
      {
        heading: "3-1. Payment requests and wallet checks",
        paragraphs: ["Before sending, check the order's amount, supported network, receiving address or invoice, and expiry. A newly issued quote may differ from an expired one. Late, post-cancellation, insufficient, excess, or duplicate payments do not automatically confirm an order or guarantee the previous price, stock, or seat. The Company verifies what it actually received and explains any agreed fulfillment or lawful return procedure.", "If you send to an address or network the Company did not designate, or lose access to a wallet it does not control, the Company does not guarantee recovery of those assets. Responsibility for the Company's incorrect instructions or attributable security failures remains unaffected. Check any fee charged by your sending wallet or network before paying."],
      },
      {
        heading: "3-2. Transaction documents",
        paragraphs: ["If you need transaction documents, contact the Center with your order reference. Whether a tax invoice, invoice for a VAT-exempt supply, cash receipt, or another document is issued depends on the transaction, the recipient, and applicable tax law. Where issuance is legally required, the applicable procedures and deadlines apply.", "An order page or payment-service confirmation does not by itself replace a tax invoice, invoice for a VAT-exempt supply, or cash receipt. Paying in Bitcoin does not mean that every transaction receives the same tax treatment or documents."],
      },
      {
        heading: "4. Delivery, collection, and events",
        paragraphs: ["Available delivery regions, shipping charges, and pickup options are shown at checkout. A separately agreed supply schedule applies. Without one, the Center takes necessary supply measures within seven days of the order request, or within three business days of receiving payment for a prepaid order. This does not guarantee arrival within that period. If supply is delayed or impossible, the Center explains the reason and next steps and fulfills statutory refund duties.", "Report loss, damage in transit, or an incorrect shipment to the Center. It will investigate and explain lawful measures such as replacement, exchange, or refund; you are not required to pursue the carrier alone to obtain a remedy. If an incorrect address or absence attributable to you causes return or redelivery, the Center explains actual costs and their basis to the extent you are responsible. Pickup follows the location, schedule, and verification instructions for the order.", "The event listing provides its schedule, venue, participation terms, and capacity. If the Center cancels an event or changes a material term, it will notify registrants where possible and handle the change under applicable law and the displayed terms."],
      },
      {
        heading: "5. Cancellation, returns, and refunds",
        paragraphs: ["You can cancel an unpaid order on its order page while that option is available. If a payment request has been issued or payment is in progress, contact the Center. Paid-order returns and event cancellations are governed by the Refund and Return Policy and applicable law.", "Refunds use the original satoshi amount paid, without recalculation at the KRW exchange rate on the refund date. A full refund returns all originally paid satoshis in Bitcoin; a partial refund returns the original satoshis attributable to the refunded items or services. Statutory rights remain unaffected."],
      },
      {
        heading: "6. Content and intellectual property",
        paragraphs: ["Rights in text, photographs, video, designs, and other content that the Center creates or lawfully obtains belong to the Center or the relevant rightsholder. Posting an item on this site does not transfer to the Center any rights in third-party books, covers, artwork, products, photographs, visitor stories, trade names, or trademarks.", "Except with the rightsholder's permission or as permitted by law, visitors must not reproduce, repost, distribute, transmit to the public, or commercially exploit content on the site protected by copyright or other applicable rights. Buying a product or attending an event does not transfer copyright or trademark rights in its content.", "Rights in external visitor stories and their images belong to their respective rightsholders. A link to the original or author credit does not grant permission to reuse that material. Where the Center has obtained separate permission, it may display the story or image within the scope of that permission.", "Sending a collaboration proposal or inquiry does not automatically transfer rights in the proposal, idea, or materials. The Center may use them only to review and respond. Publicity, business use, or rights in jointly created work require a separate agreement. Please agree on confidentiality terms before sending confidential material."],
      },
      {
        heading: "7. User duties and access restrictions",
        paragraphs: ["Do not misuse another person's information or payment method, place fraudulent orders or payments, infringe others' rights, access systems without authorization, bypass security, or disrupt services with malicious requests. Keep order links, codes, and event tickets secure, and notify the Center of suspected disclosure or misuse.", "The Center may restrict access as necessary to address unlawful conduct or security threats. Where possible, it explains the reason and how to challenge the restriction; urgent protective action may precede that notice. A restriction does not itself remove duties to fulfill or refund paid orders or your statutory rights.", "Minors must obtain a legal representative's consent where required for a contract. A minor or their legal representative may cancel a contract made without required consent in accordance with applicable law. Follow the age, safety, and venue rules disclosed for an event."],
      },
      {
        heading: "7-1. Event safety and content protection",
        paragraphs: ["For violence, threats, harassment, infringement of others' rights, repeated disruption, or failure to follow reasonable safety instructions, the Center may warn, restrict entry, or request departure as necessary to protect safety. Urgent danger may require action without prior warning. Fees are handled according to the circumstances, services actually provided, and applicable law; removal alone does not forfeit the entire fee.", "Without separate permission or a legal basis, do not record, film, or redistribute lectures or teaching materials, or publicly share images of other participants. Users should safeguard their belongings and wallet credentials. The Center does not provide custody of items it has not separately accepted for safekeeping. Statutory responsibility for the Company's negligent safety management or custody is assessed separately. The Center also follows separate notice and any required consent or legal basis when filming or publishing participants' images."],
      },
      {
        heading: "8. Order confirmation and notices",
        paragraphs: ["Your order page shows order details, payment status, and fulfillment arrangements. If you find an input error, use available correction or cancellation options or contact the Center. Once goods have shipped or a service has been supplied, applicable law and the Refund and Return Policy govern.", "The Center uses the supplied email and contact details or your order page for notices needed to fulfill the contract, including payment, delivery, and event changes. General notices appear on the site; changes materially affecting a particular order are also sent to the supplied contact details. If incorrect contact details prevent delivery of a notice, you may ask the Center to confirm it; this alone does not restrict statutory rights."],
      },
      {
        heading: "9. Service changes and interruptions",
        paragraphs: ["Maintenance, replacement, faults, communications or payment-service interruptions, natural disasters, or similar circumstances may temporarily interrupt parts of the service. Planned interruptions are announced in advance. Where an emergency prevents advance notice, the Center explains the reason and response when possible.", "During an interruption, the Center will identify existing orders and take necessary fulfillment or refund measures. If closure of the business or another circumstance prevents performance, it will notify users and act under applicable law. This section does not exclude responsibility for matters attributable to the Center."],
      },
      {
        heading: "10. Personal information",
        paragraphs: ["The Center processes information needed for orders, payments, delivery, events, and inquiries under applicable law and the separate Privacy Policy. See that policy in the footer for information categories, purposes, retention, external services, and how to exercise your rights. Accepting these terms does not constitute separate consent where the law requires it for processing personal information."],
      },
      {
        heading: "11. Information and responsibility",
        paragraphs: ["The Center's books, exhibitions, educational activities, events, and posts support learning and information. Unless expressly agreed otherwise under a separate contract, they are not investment, legal, or tax advice tailored to your circumstances. The Center does not guarantee Bitcoin prices or investment returns.", "Damages for the Company's breach of contract cover ordinary loss with a legally sufficient causal connection. Loss arising from special circumstances is compensable under applicable law where the Company knew or could have known of those circumstances. Specific statutory rules take precedence. Unrealized investment returns, price gains, or business opportunities do not alone establish liability.", "If performance becomes impossible without intent or negligence, for example because of a natural disaster or network outage outside the Company's control, the Company is not liable for damages to the extent the law permits. Using external payment or delivery providers does not excuse fault attributable to the Company or those assisting its performance. Statutory duties, including returning payments where performance is impossible, remain applicable.", "Where user negligence, such as incorrect address entry or failure to safeguard wallet or order credentials, contributes to the occurrence or extent of loss, it is considered in determining liability and damages under applicable law. Liability for the Company's or its performance assistants' intent or gross negligence, personal injury, privacy protection, and other mandatory statutory obligations is not excluded. Statutory burdens of proof are not shifted to the user."],
      },
      {
        heading: "12. Publication and changes to these terms",
        paragraphs: ["The Center publishes these terms on the site for users to consult. Lawful amendments are announced with the changes, reasons, and effective date at least seven days in advance, or at least 30 days for adverse or material changes. Users whose existing contracts are affected also receive individual notice through their supplied contact details.", "Existing contracts generally remain governed by the terms in force when made. Adverse changes do not apply retroactively without a legal basis or lawful agreement with the user. Continued use or silence does not constitute consent to a change requiring separate consent. Send questions or objections to hello@noncelab.com or +82 2-702-1718."],
      },
      {
        heading: "13. Disputes and jurisdiction",
        paragraphs: ["Send complaints or disputes about orders, payment, delivery, events, or refunds to hello@noncelab.com or +82 2-702-1718. The Center will review them and explain possible resolution; if handling is delayed, it will explain why and provide a handling schedule.", "You may seek advice from Korea's 1372 Consumer Counseling Center, damage relief or dispute mediation from the Korea Consumer Agency (www.kca.go.kr), or mediation from the Electronic Documents and Electronic Commerce Dispute Mediation Committee (www.ecmc.or.kr). Prior negotiation with the Center or mediation is not a prerequisite for litigation or other statutory remedies.", "Mandatory jurisdiction rules, including Article 36 of Korea's Act on the Consumer Protection in Electronic Commerce, Etc., take precedence. For transactions covered by that provision, the district court for the consumer's address at the time of filing, or residence if there is no address, has exclusive jurisdiction. Cases where the address or residence is unclear and other exceptions are governed by applicable law. Other jurisdiction questions follow applicable law, including Korea's Civil Procedure Act and Act on Private International Law."],
      },
      {
        heading: "14. Governing law and interpretation",
        paragraphs: ["These terms and transactions with the Center are governed by the laws of the Republic of Korea. This choice does not deprive a consumer of protections provided by mandatory rules of their country of habitual residence under applicable law, including Korea's Act on Private International Law.", "Matters not addressed here follow applicable law and valid individual agreements. If a provision is invalid, the remaining provisions remain effective to the extent permitted by law. Ambiguous terms are interpreted in the user's favor."],
      },
    ],
  },
};
