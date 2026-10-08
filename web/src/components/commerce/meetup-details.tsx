import type { Locale } from "@/i18n/routing";
import type { MeetupInfo } from "@/lib/commerce-kind";
import { centerContent } from "@/content/center";

export function MeetupDetails({ meetups, locale, confirmed = false }: { readonly meetups: readonly MeetupInfo[]; readonly locale: Locale; readonly confirmed?: boolean }) {
  const ko = locale === "ko";
  return <div className="form-stack">
    {meetups.map((meetup) => {
      const date = new Date(`${meetup.date.replaceAll(".", "-")}T12:00:00+09:00`);
      const dateLabel = Number.isFinite(date.getTime()) ? new Intl.DateTimeFormat(ko ? "ko-KR" : "en-GB", { dateStyle: "long", timeZone: "Asia/Seoul" }).format(date) : meetup.date;
      const venue = meetup.isOnline ? (ko ? "온라인" : "Online") : meetup.venueType === "center" ? centerContent[locale].visit.address.value : (ko ? meetup.location : meetup.locationEn || meetup.location);
      return <dl className="commerce-facts" key={meetup.id}>
        <div><dt>{ko ? "행사 일정" : "Event schedule"}</dt><dd>{dateLabel}{meetup.time ? `, ${meetup.time}` : ""}</dd></div>
        <div><dt>{ko ? "참여 장소" : "Venue"}</dt><dd>{venue || (ko ? "행사 안내를 확인해 주세요." : "Check the event listing.")}</dd></div>
      </dl>;
    })}
    {confirmed && meetups.some((meetup) => !meetup.isOnline) && <p className="muted">{ko ? "행사 장소에서 확인 페이지를 보여 주세요." : "Show your confirmation at the event venue."}</p>}
    {!meetups.length && <p className="muted">{ko ? "일정과 참여 방법은 행사 안내를 확인해 주세요." : "Check the event listing for the schedule and attendance instructions."}</p>}
  </div>;
}
