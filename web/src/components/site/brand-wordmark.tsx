import "@/styles/brand.css";

export function BrandWordmark() {
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/brand/bcs-horizontal-color.png" width={1234} height={356} alt="" className="wordmark-img wordmark-color" decoding="async" aria-hidden="true" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/brand/bcs-horizontal-color-dark.png" width={1234} height={356} alt="" className="wordmark-img wordmark-dark" decoding="async" aria-hidden="true" />
    </>
  );
}
