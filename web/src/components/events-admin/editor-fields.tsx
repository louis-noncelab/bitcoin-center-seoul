import type { Locale } from "@/i18n/routing";
import type { EventRecord, HighlightRecord } from "@/lib/events-contract";
import { ChoiceControl, FormControl } from "@/components/ui/primitives";
import { DateField } from "@/components/ui/date-field";
import { MarkdownHelp } from "./markdown-help";
import { MarkdownEditor } from "./markdown-editor";
import { TagsField } from "./tags-field";

export type ContentKind = "events" | "highlights";
export type ContentRecord = EventRecord | HighlightRecord;

export function EditorFields({ locale, kind, record, onPending, onDirty, onExpired }: {
  readonly locale: Locale; readonly kind: ContentKind; readonly record: ContentRecord | null;
  readonly onPending: (pending: boolean) => void; readonly onDirty: () => void; readonly onExpired: () => void;
}) {
  const ko = locale === "ko";
  const event = record && "time" in record ? record : null;
  const highlight = record && "meta" in record ? record : null;
  function input(name: string, label: string, value = "", type = "text", required = false) {
    if (type === "date") return <DateField key={name} name={name} label={label} defaultValue={value} required={required} onDirty={onDirty} />;
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
      <TagsField tags={record?.tags ?? []} />
      <div className="events-field-grid">
        <MarkdownEditor name="description" label="설명 · 한국어" defaultValue={record?.description ?? ""} required helpId="description-markdown-help" onPending={onPending} onDirty={onDirty} onExpired={onExpired} />
        <MarkdownEditor name="descriptionEn" label="설명 · 영어" defaultValue={record?.descriptionEn ?? ""} required helpId="description-markdown-help" onPending={onPending} onDirty={onDirty} onExpired={onExpired} />
      </div>
      <MarkdownHelp id="description-markdown-help" />
      {kind === "events" ? (
        <div className="events-field-grid">
          {input("date", ko ? "행사 날짜" : "Event date", date(event?.date), "date", true)}
          <label>{ko ? "시간" : "Time"}
            <FormControl><input name="time" defaultValue={event?.time ?? ""} maxLength={100} placeholder="14:00 ~ 16:00" aria-describedby="event-time-help" /></FormControl>
            <span id="event-time-help" className="muted">{ko ? "한국 시간의 시작·종료 시각을 입력하면 ‘밋업 중’ 표시에 반영됩니다. 예: 19:00 ~ 21:00. 종료가 시작보다 이르면 다음 날 종료로 계산합니다." : "Enter start and end times in Korea time for the live status, e.g. 19:00 ~ 21:00. An earlier end time means the following day."}</span>
          </label>
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
          <label className="events-checkbox"><ChoiceControl name="is_active" type="checkbox" defaultChecked={highlight ? Boolean(highlight.is_active) : true} />{ko ? "공개" : "Published"}</label>
          <input name="icon" type="hidden" value={highlight?.icon ?? "calendar"} />
        </>
      )}
      {input("link", ko ? "관련 링크 (선택)" : "Related link (optional)", record?.link ? (/^www\./.test(record.link) ? `https://${record.link}` : record.link) : "", "url")}
    </>
  );
}
