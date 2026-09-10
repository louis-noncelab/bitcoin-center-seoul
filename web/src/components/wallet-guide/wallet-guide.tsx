"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { Button, ChoiceControl } from "@/components/ui/primitives";
import { guidePhases, walletCopy, walletModels, type PhoneOS, type WalletModel } from "@/content/wallet-guide";
import type { Locale } from "@/i18n/routing";
import appleQR from "../../../../public/images/experence/apple_download_qr.png";
import googleQR from "../../../../public/images/experence/google_download_qr.png";
import { GuideStep } from "./guide-step";

const downloads = {
  android: { image: googleQR, href: "https://play.google.com/store/apps/details?id=onl.coconut.wallet.regtest" },
  ios: { image: appleQR, href: "https://apps.apple.com/gt/app/%EC%BD%94%EC%BD%94%EB%84%9B-%EC%9B%94%EB%A0%9B-%ED%95%99%EC%8A%B5%EC%9A%A9/id6654902298?l=en-GB" },
} as const;

export function WalletGuide({ locale }: { readonly locale: Locale }) {
  const copy = walletCopy[locale];
  const [step, setStep] = useState(0);
  const [os, setOS] = useState<PhoneOS | null>(null);
  const [model, setModel] = useState<WalletModel | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const previousStep = useRef(step);
  const phase = guidePhases[step - 4];
  const download = os ? downloads[os] : null;

  useEffect(() => {
    if (previousStep.current !== step) {
      heading.current?.focus();
      previousStep.current = step;
    }
  }, [step]);

  function restart() {
    setStep(0);
    setOS(null);
    setModel(null);
  }

  const title = phase
    ? `${step - 3} / 5 · ${copy.phases[phase].replace(/^Phase \d+\. /, "")}`
    : [copy.welcome.title, copy.phoneSelection.title, copy.download.title, copy.walletSelection.title][step]
      ?? (step === 9 ? copy.final.question : step === 10 ? copy.final.retryMessage : copy.final.congratulations);

  return (
    <section className="wallet-guide" aria-labelledby="wallet-step-title">
      <div className="wallet-toolbar">
        <p className="caption muted">{locale === "ko" ? "센터 현장 체험 · 테스트 비트코인 전용" : "In-center guide · Test Bitcoin only"}</p>
        {step > 0 && <Button variant="quiet" onClick={restart}>{copy.restart}</Button>}
      </div>
      <div className="wallet-panel" key={step}>
        <h2 id="wallet-step-title" ref={heading} tabIndex={-1}>{title}</h2>
        {step === 0 && (
          <div className="wallet-intro">
            <p>{copy.welcome.message1}</p>
            <p>{copy.welcome.message2}</p>
            <p className="muted">{copy.welcome.message3}</p>
          </div>
        )}
        {step === 1 && (
          <fieldset className="wallet-selection">
            <legend>{copy.phoneSelection.message}</legend>
            <div className="wallet-options">
              {(["android", "ios"] as const).map((value) => (
                <label key={value}>
                  <ChoiceControl type="radio" name="phone-os" value={value} checked={os === value} onChange={() => setOS(value)} />
                  <span>{copy.phoneSelection[value]}</span>
                </label>
              ))}
            </div>
          </fieldset>
        )}
        {step === 2 && os && download && (
          <div className="wallet-download">
            <p>{copy.download[os]}</p>
            <Image src={download.image} alt={locale === "ko" ? "앱 다운로드 QR 코드" : "App download QR code"} width={256} height={256} unoptimized />
            <a href={download.href} className="button" data-variant="secondary" target="_blank" rel="noopener noreferrer">
              {locale === "ko" ? "앱 스토어 열기" : "Open app store"}
            </a>
          </div>
        )}
        {step === 3 && (
          <fieldset className="wallet-selection">
            <legend>{copy.walletSelection.message}</legend>
            <div className="wallet-options" data-models>
              {walletModels.map((value) => (
                <label key={value}>
                  <ChoiceControl type="radio" name="wallet-model" value={value} checked={model === value} onChange={() => setModel(value)} />
                  <span>{value}</span>
                </label>
              ))}
            </div>
          </fieldset>
        )}
        {phase && model && (
          <>
            <p className="wallet-model">{model}</p>
            <GuideStep locale={locale} model={model} phase={phase} />
          </>
        )}
        <div className="wallet-actions">
          {step > 0 && step < 11 && (
            <Button variant="secondary" onClick={() => setStep(step === 10 ? 9 : step - 1)}>{copy.prev}</Button>
          )}
          {step < 9 && (
            <Button disabled={(step === 1 && !os) || (step === 3 && !model)} onClick={() => setStep(step + 1)}>
              {step === 0 ? copy.welcome.button : step === 2 ? copy.download.button : copy.next}
            </Button>
          )}
          {step === 9 && (
            <>
              <Button onClick={() => setStep(11)}>{copy.final.yes}</Button>
              <Button variant="secondary" onClick={() => setStep(10)}>{copy.final.no}</Button>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
