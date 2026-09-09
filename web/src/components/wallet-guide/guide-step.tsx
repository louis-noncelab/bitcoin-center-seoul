import Image from "next/image";
import { walletGuides, type GuidePhase, type WalletModel } from "@/content/wallet-guide";
import type { Locale } from "@/i18n/routing";
import receivingQR from "../../../../public/images/experence/receiving_qr.png";

export function GuideStep({ locale, model, phase }: {
  readonly locale: Locale;
  readonly model: WalletModel;
  readonly phase: GuidePhase;
}) {
  return (
    <>
      {phase === "phase1" && (
        <p className="wallet-notice" role="note">
          {locale === "ko"
            ? "아래 니모닉과 PIN은 센터 체험용으로 공개된 예제입니다. 실제 자산을 보관하는 지갑에 절대 사용하지 마세요. 센터 체험 기기와 코코넛 월렛 학습용에서만 진행하세요."
            : "The mnemonic and PIN below are public demo examples for the center’s devices. Never use them for a wallet holding real funds. Use only the center’s demo devices and Coconut Wallet Learning Edition."}
        </p>
      )}
      <ol className="wallet-instructions">
        {walletGuides[model][locale][phase].map((instruction, index) => (
          <li key={`${phase}-${index}`}>{instruction}</li>
        ))}
      </ol>
      {phase === "phase3" && (
        <figure className="wallet-qr">
          <Image src={receivingQR} alt={locale === "ko" ? "학습용 네트워크 수신 주소 QR 코드" : "Learning network receiving address QR code"} width={256} height={256} unoptimized />
          <figcaption>
            <p>{locale === "ko" ? "학습용 regtest 네트워크의 테스트 주소입니다. 실제 비트코인을 보내지 마세요." : "Test address for the learning app’s regtest network. Do not send real Bitcoin."}</p>
            <code>bcrt1qxdyjf6h5d6qxap4n2dap97q4j5ps6ua8jkxz0z</code>
          </figcaption>
        </figure>
      )}
    </>
  );
}
