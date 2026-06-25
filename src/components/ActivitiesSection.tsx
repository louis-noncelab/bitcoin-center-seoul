import {
  CalendarDays,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

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

  const featured = homeEvents?.[0]
    ? {
        label: language === 'ko' ? '다가오는 이벤트' : 'Upcoming Event',
        ...homeEvents[0],
      }
    : section.featured;
  const featuredEventId = 'raw' in featured ? featured.raw.id : null;
  const sideEvents = homeEvents?.filter((event) => event.raw.id !== featuredEventId).slice(0, 3) || section.activities.slice(0, 3);
  const viewEvent = (event: EventRecord) => ({
    title: language === 'ko' ? event.title : event.titleEn,
    location: language === 'ko' ? event.location : event.locationEn,
    description: formatMultiline(language === 'ko' ? event.description : event.descriptionEn),
    image: event.image || fallbackImage,
  });

  return (
    <section id="events" className="bg-card py-20">
      <div className="container mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-foreground to-bitcoin bg-clip-text text-transparent">
              {section.title}
            </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              {section.subtitle}
            </p>
        </div>

        <div className={sideEvents.length > 0 ? 'grid gap-6 lg:grid-cols-[1.25fr_0.75fr]' : 'grid gap-6'}>
          <article className="overflow-hidden rounded-lg border border-border bg-background shadow-lg">
            <div className="relative min-h-[420px]">
              <img
                src={featured.image}
                alt={featured.title}
                className="absolute inset-0 h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-b from-background/95 via-background/60 to-background/90" />
              <div className="absolute inset-x-0 top-0 p-6 md:p-8">
                <span className="mb-2 inline-flex items-center rounded-md bg-bitcoin px-3 py-1 text-xs font-semibold text-bitcoin-foreground">
                  {featured.label}
                </span>
                {'meta' in featured && (
                  <div className="mb-4 -ml-1 flex w-fit items-center gap-2 rounded-md bg-background/80 px-4 py-2 text-xs font-medium text-bitcoin backdrop-blur-sm">
                    <CalendarDays className="h-4 w-4" />
                    {featured.meta}
                  </div>
                )}
                <h3 className="mb-4 max-w-2xl text-3xl font-bold leading-tight text-foreground md:text-4xl">
                  {featured.title}
                </h3>
              </div>
              {'raw' in featured && (
                <div className="absolute inset-x-0 bottom-0 p-6 md:p-8">
                  <button
                    type="button"
                    onClick={() => setSelectedEvent(featured.raw)}
                    className="inline-flex rounded-md border border-bitcoin px-4 py-2 text-sm font-medium text-bitcoin transition-colors hover:bg-bitcoin hover:text-bitcoin-foreground"
                  >
                    {language === 'ko' ? '자세히 보기' : 'View Details'}
                  </button>
                </div>
              )}
            </div>
          </article>

          {sideEvents.length > 0 && (
            <aside className="grid gap-4">
              {sideEvents.slice(0, 2).map((activity) => (
                <article
                  key={activity.title}
                  className="relative flex min-h-44 overflow-hidden rounded-lg border border-border bg-background shadow-lg"
                >
                  {activity.image && (
                    <img
                      src={activity.image}
                      alt={activity.title}
                      className="absolute inset-0 h-full w-full object-cover"
                    />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-b from-background/95 via-background/65 to-background/90" />
                  <div className="relative z-10 flex min-h-44 w-full flex-col p-5">
                    <div className="mb-3 flex items-center gap-2 text-xs font-medium text-bitcoin">
                      <activity.icon className="h-4 w-4" />
                      {activity.meta}
                    </div>
                    <h4 className="mb-2 text-base font-semibold text-foreground">
                      {activity.title}
                    </h4>
                    {'raw' in activity && (
                      <button
                        type="button"
                        onClick={() => setSelectedEvent(activity.raw)}
                        className="mt-auto w-fit text-sm font-medium text-bitcoin transition-colors hover:text-bitcoin-light"
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
          <div className="mt-8 flex justify-center">
            <button
              type="button"
              onClick={() => setShowAllEvents(true)}
              className="rounded-md border border-bitcoin px-5 py-2 text-sm font-medium text-bitcoin transition-colors hover:bg-bitcoin hover:text-bitcoin-foreground"
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
              <p>Date: {selectedEvent.date}</p>
              <p>Time: {selectedEvent.time}</p>
              <p>Location: {viewEvent(selectedEvent).location}</p>
            </div>
            <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
              {viewEvent(selectedEvent).description}
            </p>
            {selectedEvent.link && (
              <a
                href={selectedEvent.link}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex w-fit rounded-md border border-bitcoin px-3 py-2 text-sm text-bitcoin transition-colors hover:bg-bitcoin hover:text-bitcoin-foreground"
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
                    <img src={view.image} alt={view.title} className="aspect-video w-full rounded-md object-cover md:h-28 md:w-40" />
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
