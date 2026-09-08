import { Manrope, Noto_Sans_KR } from "next/font/google";

const manrope = Manrope({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-manrope",
});

const notoSansKR = Noto_Sans_KR({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-noto-kr",
});

type TypeComparisonProps = {
  locale: string;
};

export function TypeComparison({ locale }: TypeComparisonProps) {
  const english = locale === "en";
  const candidates = [
    {
      id: "manrope-noto",
      label: "A · Manrope + Noto Sans KR",
      note: english
        ? "Comparison only · calm, broad Latin headings with familiar Korean text"
        : "비교용 · 넓고 차분한 영문 제목, 익숙한 한글 본문",
    },
    {
      id: "manrope-pretendard",
      label: "B · Manrope + Pretendard",
      note: english
        ? "Comparison only · keeps display character while making Korean text more compact"
        : "비교용 · 영문 제목의 개성을 유지하며 한글 문장을 더 조밀하게",
    },
    {
      id: "pretendard",
      label: "C · Pretendard",
      note: english
        ? "Current default · one family gives an even bilingual reading rhythm"
        : "현재 기본값 · 한 가족으로 통일한 한영 읽기 흐름",
    },
  ];

  return (
    <section className={`font-comparison ${manrope.variable} ${notoSansKR.variable}`} aria-labelledby="font-comparison-title">
      <div className="font-comparison-heading">
        <h3 id="font-comparison-title">{english ? "Typeface comparison" : "서체 비교"}</h3>
        <p className="caption muted">
          {english
            ? "Compare the same Korean and English sample at heading, body and caption sizes."
            : "같은 한국어·영어 문장을 제목, 본문, 캡션 크기로 비교합니다."}
        </p>
      </div>
      <ol className="font-comparisons">
        {candidates.map((candidate) => (
          <li key={candidate.id}>
            <article className="font-candidate" data-family={candidate.id}>
              <header>
                <p className="font-candidate-label">{candidate.label}</p>
                <p className="caption muted">{candidate.note}</p>
              </header>
              <div className="font-samples">
                <div className="font-sample-heading">
                  <p lang="ko">비트코인 센터 서울</p>
                  <p lang="en">Bitcoin Center Seoul</p>
                </div>
                <div className="font-sample-body">
                  <p lang="ko">전시, 교육, 하드월렛 체험과 커뮤니티 밋업이 함께 있는 서울의 비트코인 공간입니다.</p>
                  <p lang="en">A Bitcoin space in Seoul for exhibitions, education, hardware wallet experiences and community meetups.</p>
                </div>
                <div className="font-sample-caption caption muted">
                  <p lang="ko">방문 전에 공간의 온도와 리듬을 먼저 느껴보세요.</p>
                  <p lang="en">Feel the room&apos;s warmth and rhythm before you visit.</p>
                </div>
              </div>
            </article>
          </li>
        ))}
      </ol>
    </section>
  );
}
