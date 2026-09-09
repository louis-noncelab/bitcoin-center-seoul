import type { Locale } from "@/i18n/routing";
import type { EventRecord, HighlightRecord } from "@/lib/events-contract";
import { FormControl } from "@/components/ui/primitives";

export type ContentKind = "events" | "highlights";
export type ContentRecord = EventRecord | HighlightRecord;

export function EditorFields({ locale, kind, record }: {
  readonly locale: Locale; readonly kind: ContentKind; readonly record: ContentRecord | null;
}) {
  const ko = locale === "ko";
  const event = record && "time" in record ? record : null;
  const highlight = record && "meta" in record ? record : null;
  function input(name: string, label: string, value = "", type = "text", required = false) {
    const maximum = type === "url" ? 2048 : /^(location|host)/.test(name) ? 300 : /^(time|category)/.test(name) ? 100 : 200;
    return <label key={name}>{label}<FormControl><input name={name} defaultValue={value} type={type} required={required} maxLength={maximum} /></FormControl></label>;
  }
  const date = (value: string | undefined) => (value ?? "").replaceAll(".", "-");
  return (
    <>
      <div className="events-field-grid">
        {input("title", ko ? "제목 · 한국어" : "Title · Korean", record?.title, "text", true)}
        {input("titleEn", ko ? "제목 · 영어" : "Title · English", record?.titleEn, "text", true)}
      </div>
      <label>
        URL 슬러그
        <FormControl><input name="slug" aria-label="URL 슬러그" defaultValue={record?.slug ?? ""} required={!record} maxLength={100} pattern="(?=.*[a-z])[a-z0-9]+(-[a-z0-9]+)*" placeholder="bitcoin-developer-meetup" autoCapitalize="none" spellCheck={false} aria-describedby="slug-help" /></FormControl>
        <span id="slug-help" className="muted">/{locale}/{kind === "events" ? "programs" : "journal"}/ 뒤에 붙는 주소입니다. 영문 소문자·숫자·하이픈(-)을 사용해 주세요. 주소를 바꿔도 이전 링크는 새 주소로 연결됩니다.</span>
      </label>
      <div className="events-field-grid">
        <label>{ko ? "설명 · 한국어" : "Description · Korean"}<FormControl><textarea name="description" defaultValue={record?.description ?? ""} rows={8} required maxLength={20000} /></FormControl></label>
        <label>{ko ? "설명 · 영어" : "Description · English"}<FormControl><textarea name="descriptionEn" defaultValue={record?.descriptionEn ?? ""} rows={8} required maxLength={20000} /></FormControl></label>
      </div>
      {kind === "events" ? (
        <div className="events-field-grid">
          {input("date", ko ? "행사 날짜" : "Event date", date(event?.date), "date", true)}
          {input("time", ko ? "시간" : "Time", event?.time)}
          {input("location", ko ? "장소 · 한국어" : "Location · Korean", event?.location)}
          {input("locationEn", ko ? "장소 · 영어" : "Location · English", event?.locationEn)}
        </div>
      ) : (
        <>
          <p className="muted">{ko ? "하루 행사라면 날짜를, 여러 날에 걸친 행사라면 시작일과 종료일을 입력해 주세요." : "Enter a single date, or a start and end date for a multi-day event."}</p>
          <div className="events-field-grid">
            {input("date", ko ? "날짜" : "Date", date(highlight?.date), "date")}
            {input("startDate", ko ? "시작일" : "Start date", date(highlight?.startDate), "date")}
            {input("endDate", ko ? "종료일" : "End date", date(highlight?.endDate), "date")}
            {input("meta", ko ? "짧은 안내 · 한국어" : "Short note · Korean", highlight?.meta)}
            {input("metaEn", ko ? "짧은 안내 · 영어" : "Short note · English", highlight?.metaEn)}
            {input("category", ko ? "분류 · 한국어" : "Category · Korean", highlight?.category ?? "행사")}
            {input("categoryEn", ko ? "분류 · 영어" : "Category · English", highlight?.categoryEn ?? "Event")}
            {input("host", ko ? "주최 · 한국어" : "Host · Korean", highlight?.host ?? "비트코인 센터 서울")}
            {input("hostEn", ko ? "주최 · 영어" : "Host · English", highlight?.hostEn ?? "Bitcoin Center Seoul")}
            <input name="sort_order" type="hidden" value={highlight?.sort_order ?? 0} />
          </div>
          <label className="events-checkbox"><input name="is_active" type="checkbox" defaultChecked={highlight ? Boolean(highlight.is_active) : true} />{ko ? "공개" : "Published"}</label>
          <input name="icon" type="hidden" value={highlight?.icon ?? "calendar"} />
        </>
      )}
      {input("link", ko ? "관련 링크 (선택)" : "Related link (optional)", record?.link ? (/^www\./.test(record.link) ? `https://${record.link}` : record.link) : "", "url")}
    </>
  );
}
