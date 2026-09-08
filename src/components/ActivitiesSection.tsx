import {
  CalendarDays,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useReveal } from '@/hooks/use-reveal';

interface EventRecord {
  id: number;
  title: string;
  titleEn: string;
  date: string;
  time: string;
  location: string;
  locationEn: string;
  description: string;
  descriptionEn: string;
  image?: string;
  link?: string;
}

const ActivitiesSection = () => {
  const { language } = useLanguage();
  const revealRef = useReveal<HTMLElement>();
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<EventRecord | null>(null);
  const [showAllEvents, setShowAllEvents] = useState(false);

  const content = {
    ko: {
      eyebrow: 'EVENTS',
      title: '이벤트',
      subtitle:
        '비트코인 센터 서울에서 열리는 정기 밋업, 교육, 체험, 커뮤니티 행사를 확인하세요.',
      featured: {
        label: '다음 행사',
        title: '등록된 이벤트가 없습니다',
        description: '관리자 페이지에서 이벤트를 등록하면 이 영역에 표시됩니다.',
        image: '/images/main1.png',
      },
      eventTitle: '행사 하이라이트',
      eventSubtitle: '실제 활동의 순간들을 확인해보세요.',
      activities: [],
    },
    en: {
      eyebrow: 'EVENTS',
      title: 'Events',
      subtitle:
        'Explore regular meetups, education, hands-on experiences, and community events at Bitcoin Center Seoul.',
      featured: {
        label: 'Next Event',
        title: 'No events have been added',
        description: 'Events added in the admin page will appear here.',
        image: '/images/main1.png',
      },
      eventTitle: 'Event Highlights',
      eventSubtitle: 'Add real event records as photos become available.',
      activities: [],
    },
  };

  const section = content[language];
  const fallbackImage = '/images/main1.png';
  const formatMultiline = (text: string) => text.replace(/\\n/g, '\n');

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const response = await fetch('/api/events/upcoming');
        if (response.ok) {
          setEvents(await response.json());
        }
      } catch (error) {
        console.error('이벤트 데이터를 가져오는데 실패했습니다.', error);
      }
    };

    fetchEvents();
  }, []);

  const homeEvents = useMemo(() => {
    if (events.length === 0) return null;

    return events.map((event) => ({
      raw: event,
      title: language === 'ko' ? event.title : event.titleEn,
      meta: `${event.date}${event.time ? ` · ${event.time}` : ''}`,
      description: formatMultiline(language === 'ko' ? event.description : event.descriptionEn),
      image: event.image || fallbackImage,
      link: event.link || '',
      icon: CalendarDays,
    }));
  }, [events, language]);

  const featuredEvent = homeEvents?.[0] ?? null;
  const featured = featuredEvent
    ? {
        label: language === 'ko' ? '다가오는 이벤트' : 'Upcoming Event',
        ...featuredEvent,
      }
    : section.featured;
  const featuredEventId = featuredEvent?.raw.id ?? null;
  const sideEvents = homeEvents?.filter((event) => event.raw.id !== featuredEventId).slice(0, 3) || section.activities.slice(0, 3);
  const viewEvent = (event: EventRecord) => ({
    title: language === 'ko' ? event.title : event.titleEn,
    location: language === 'ko' ? event.location : event.locationEn,
    description: formatMultiline(language === 'ko' ? event.description : event.descriptionEn),
    image: event.image || fallbackImage,
  });

  return (
    <section id="events" ref={revealRef} className="motion-reveal scroll-mt-[72px] bg-card py-16 md:py-24">
      <div className="container mx-auto px-6">
        <div className="mb-10 text-center md:mb-14">
          <p className="mb-3 text-xs font-semibold tracking-[0.2em] text-bitcoin">{section.eyebrow}</p>
          <h2 className="mb-4 pb-1 text-3xl font-bold text-foreground md:text-4xl">
              {section.title}
            </h2>
          <p className="mx-auto max-w-2xl text-base text-muted-foreground md:text-lg">
              {section.subtitle}
            </p>
        </div>

        <div className={sideEvents.length > 0 ? 'grid gap-6 lg:grid-cols-[1.4fr_1fr] lg:gap-8' : 'grid gap-6'}>
          <article className="motion-lift overflow-hidden rounded-lg border border-border bg-background">
            {featuredEvent ? (
              <>
                <img
                  src={featuredEvent.image}
                  alt={featuredEvent.title}
                  className="aspect-[16/10] w-full object-cover md:aspect-[2/1]"
                />
                <div className="p-6 md:p-8">
                  <span className="inline-flex items-center rounded-md bg-bitcoin px-3 py-1 text-xs font-semibold text-bitcoin-foreground">
                    {featured.label}
                  </span>
                  <p className="mt-3 flex items-center gap-2 text-xs font-medium text-bitcoin">
                    <CalendarDays className="h-4 w-4" />
                    {featuredEvent.meta}
                  </p>
                  <h3 className="mt-2 text-2xl font-bold leading-tight text-foreground md:text-3xl">
                    {featuredEvent.title}
                  </h3>
                  {featuredEvent.description && (
                    <p className="mt-3 line-clamp-3 whitespace-pre-line text-sm text-muted-foreground">
                      {featuredEvent.description}
                    </p>
                  )}
                  <button
                    type="button"
                    onClick={() => setSelectedEvent(featuredEvent.raw)}
                    className="motion-press mt-5 inline-flex rounded-md border border-bitcoin px-4 py-2 text-sm font-medium text-bitcoin hover:bg-bitcoin hover:text-bitcoin-foreground"
                  >
                    {language === 'ko' ? '자세히 보기' : 'View Details'}
                  </button>
                </div>
              </>
            ) : (
              <div className="p-8 text-center">
                <span className="inline-flex items-center rounded-md bg-bitcoin px-3 py-1 text-xs font-semibold text-bitcoin-foreground">
                  {featured.label}
                </span>
                <h3 className="mt-4 text-2xl font-bold text-foreground">{featured.title}</h3>
                <p className="mt-3 text-sm text-muted-foreground">{featured.description}</p>
              </div>
            )}
          </article>

          {sideEvents.length > 0 && (
            <aside className="hidden gap-4 lg:grid">
              {sideEvents.slice(0, 2).map((activity) => (
                <article
                  key={activity.title}
                  className="motion-lift grid overflow-hidden rounded-lg border border-border bg-background md:grid-cols-[9rem_1fr]"
                >
                  {activity.image && (
                    <img
                      src={activity.image}
                      alt={activity.title}
                      loading="lazy"
                      decoding="async"
                      className="aspect-[4/3] h-full w-full object-cover"
                    />
                  )}
                  <div className="flex flex-col p-5">
                    <div className="mb-2 flex items-center gap-2 text-xs font-medium text-bitcoin">
                      <activity.icon className="h-4 w-4" />
                      {activity.meta}
                    </div>
                    <h4 className="text-base font-semibold text-foreground">
                      {activity.title}
                    </h4>
                    {'raw' in activity && (
                      <button
                        type="button"
                        onClick={() => setSelectedEvent(activity.raw)}
                        className="mt-auto w-fit pt-3 text-sm font-medium text-bitcoin transition-colors hover:text-bitcoin-light"
                      >
                        {language === 'ko' ? '자세히 보기' : 'View Details'}
                      </button>
                    )}
                  </div>
                </article>
              ))}
            </aside>
          )}
        </div>

        {events.length > 0 && (
          <div className="mt-10 flex justify-center">
            <button
              type="button"
              onClick={() => setShowAllEvents(true)}
              className="motion-press rounded-md border border-bitcoin px-6 py-2.5 text-sm font-medium text-bitcoin hover:bg-bitcoin hover:text-bitcoin-foreground"
            >
              {language === 'ko' ? '행사 전체보기' : 'View All Events'}
            </button>
          </div>
        )}
      </div>

      <Dialog open={Boolean(selectedEvent)} onOpenChange={(open) => !open && setSelectedEvent(null)}>
        {selectedEvent && (
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{viewEvent(selectedEvent).title}</DialogTitle>
            </DialogHeader>
            {selectedEvent.image && (
              <img src={viewEvent(selectedEvent).image} alt={viewEvent(selectedEvent).title} className="aspect-video w-full rounded-md object-cover" />
            )}
            <div className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-3">
              <p>{language === 'ko' ? '날짜' : 'Date'}: {selectedEvent.date}</p>
              <p>{language === 'ko' ? '시간' : 'Time'}: {selectedEvent.time}</p>
              <p>{language === 'ko' ? '장소' : 'Location'}: {viewEvent(selectedEvent).location}</p>
            </div>
            <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
              {viewEvent(selectedEvent).description}
            </p>
            {selectedEvent.link && (
              <a
                href={selectedEvent.link}
                target="_blank"
                rel="noopener noreferrer"
                className="motion-press inline-flex w-fit rounded-md border border-bitcoin px-3 py-2 text-sm text-bitcoin hover:bg-bitcoin hover:text-bitcoin-foreground"
              >
                {language === 'ko' ? '신청하기' : 'Register'}
              </a>
            )}
          </DialogContent>
        )}
      </Dialog>

      <Dialog open={showAllEvents} onOpenChange={setShowAllEvents}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{language === 'ko' ? '행사 전체보기' : 'All Events'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {events.map((event) => {
              const view = viewEvent(event);
              return (
                <button
                  key={event.id}
                  type="button"
                  onClick={() => {
                    setShowAllEvents(false);
                    setSelectedEvent(event);
                  }}
                  className={`w-full rounded-md border border-border bg-background p-3 text-left transition-colors hover:border-bitcoin/50 ${
                    event.image ? 'grid gap-4 md:grid-cols-[160px_1fr]' : ''
                  }`}
                >
                  {event.image && (
                    <img src={view.image} alt={view.title} loading="lazy" decoding="async" className="aspect-video w-full rounded-md object-cover md:h-28 md:w-40" />
                  )}
                  <div className="flex flex-col justify-center">
                    <p className="text-xs font-medium text-bitcoin">{event.date} · {event.time}</p>
                    <h3 className="mt-2 font-semibold text-foreground">{view.title}</h3>
                    <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{view.description}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
};

export default ActivitiesSection;
