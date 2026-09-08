import Script from "next/script";

export function DevelopmentTools() {
  if (process.env.NODE_ENV !== "development") return null;

  return (
    <>
      <Script
        src="/dev-tools/react-scan"
        strategy="afterInteractive"
        data-development-tool="react-scan"
      />
      <Script
        src="/dev-tools/react-grab"
        strategy="afterInteractive"
        data-development-tool="react-grab"
      />
    </>
  );
}
