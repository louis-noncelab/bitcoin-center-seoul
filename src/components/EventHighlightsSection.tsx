import { useEffect, useMemo, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ExternalLink } from 'lucide-react';
import { useReveal } from '@/hooks/use-reveal';

interface HighlightRecord {
  id?: number;
  title: string;
  titleEn: string;
  category?: string;
  categoryEn?: string;
  date?: string;
  startDate?: string;
  endDate?: string;
  host?: string;
  hostEn?: string;
  meta: string;
  metaEn: string;
  description: string;
  descriptionEn: string;
  image?: string;
  link?: string;
}

const tabs = [
  { value: '전체', ko: '전체', en: 'All' },
  { value: '밋업', ko: '밋업', en: 'Meetups' },
  { value: '강의', ko: '강의', en: 'Classes' },
  { value: '행사', ko: '행사', en: 'Events' },
];

const categoryLabels: Record<string, { ko: string; en: string }> = {
  전체: { ko: '전체', en: 'All' },
  밋업: { ko: '밋업', en: 'Meetup' },
  강의: { ko: '강의', en: 'Class' },
  행사: { ko: '행사', en: 'Event' },
};

const defaultHighlights: HighlightRecord[] = [];

const inferCategory = (item: HighlightRecord) => {
  const text = `${item.title} ${item.meta}`.toLowerCase();
  if (item.category) return item.category;
  if (text.includes('강의') || text.includes('교육') || text.includes('class') || text.includes('course')) return '강의';
  if (text.includes('밋업') || text.includes('meetup')) return '밋업';
  return '행사';
};

const formatDate = (date: string) => date.replaceAll('-', '.');
const getDateLabel = (item: HighlightRecord) => {
  if (item.startDate && item.endDate) {
    return `${formatDate(item.startDate)} ~ ${formatDate(item.endDate)}`;
  }
  return item.date || item.meta;
};
const getSortDate = (item: HighlightRecord) => (item.endDate || item.startDate || item.date || '').replaceAll('.', '-');

const EventHighlightsSection = () => {
  const { language } = useLanguage();
  const revealRef = useReveal<HTMLElement>();
  const [remoteHighlights, setRemoteHighlights] = useState<HighlightRecord[]>([]);
  const [activeTab, setActiveTab] = useState('전체');
  const [activePage, setActivePage] = useState(1);
  const [selectedItem, setSelectedItem] = useState<HighlightRecord | null>(null);
  const pageSize = 5;

  useEffect(() => {
    const fetchHighlights = async () => {
      try {
        const response = await fetch('/api/highlights');
        if (response.ok) setRemoteHighlights(await response.json());
      } catch (error) {
        console.error('하이라이트 데이터를 가져오는데 실패했습니다.', error);
      }
    };

    fetchHighlights();
  }, []);

  const items = remoteHighlights.length > 0 ? remoteHighlights : defaultHighlights;
  const sortedItems = useMemo(
    () => [...items].sort((a, b) => getSortDate(b).localeCompare(getSortDate(a)) || String(b.id || '').localeCompare(String(a.id || ''))),
    [items]
  );
  const filtered = useMemo(
    () => activeTab === '전체' ? sortedItems : sortedItems.filter((item) => inferCategory(item) === activeTab),
    [activeTab, sortedItems]
  );
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pagedItems = filtered.slice((activePage - 1) * pageSize, activePage * pageSize);

  useEffect(() => {
    setActivePage(1);
    setSelectedItem(null);
  }, [activeTab, language]);

  const getViewData = (item: HighlightRecord) => ({
    title: language === 'ko' ? item.title : item.titleEn,
    date: getDateLabel(item),
    host: language === 'ko' ? (item.host || '비트코인 센터 서울') : (item.hostEn || 'Bitcoin Center Seoul'),
    detail: language === 'ko' ? item.description : item.descriptionEn,
    category: categoryLabels[inferCategory(item)]?.[language] || inferCategory(item),
    link: item.link || '',
    image: item.image || '',
  });

  return (
    <section id="highlights" ref={revealRef} className="motion-reveal scroll-mt-[72px] bg-background py-16 md:py-24">
      <div className="container mx-auto px-6">
        <div className="mb-10 text-center md:mb-14">
          <p className="mb-3 text-xs font-semibold tracking-[0.2em] text-bitcoin">HIGHLIGHTS</p>
          <h2 className="mb-4 pb-1 text-3xl font-bold text-foreground md:text-4xl">
            {language === 'ko' ? '하이라이트' : 'Highlights'}
          </h2>
          <p className="mx-auto max-w-2xl text-base text-muted-foreground md:text-lg">
            {language === 'ko'
              ? '실제 활동의 순간들을 확인해보세요.'
              : 'Explore real moments from past Bitcoin Center Seoul activities.'}
          </p>
        </div>

        <div className="mb-8 flex flex-nowrap justify-start gap-2 overflow-x-auto pb-1 md:justify-center">
          {tabs.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => {
                setActiveTab(tab.value);
              }}
              className={`shrink-0 whitespace-nowrap rounded-full border px-5 py-2 text-sm font-medium transition-colors ${
                activeTab === tab.value
                  ? 'border-bitcoin bg-bitcoin text-bitcoin-foreground'
                  : 'border-border text-muted-foreground hover:border-bitcoin hover:text-bitcoin'
              }`}
            >
              {tab[language]}
            </button>
          ))}
        </div>

        <div className="mx-auto max-w-5xl">
          {filtered.length === 0 ? (
            <div className="rounded-md border border-border bg-card p-8 text-center text-sm text-muted-foreground">
              {language === 'ko' ? '등록된 하이라이트가 없습니다.' : 'No highlights have been added yet.'}
            </div>
          ) : (
          <div className="grid gap-4">
            {pagedItems.map((item, index) => {
              const view = getViewData(item);

              return (
                <div
                  key={`${item.title}-${index}`}
                  onClick={() => setSelectedItem(item)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      setSelectedItem(item);
                    }
                  }}
                  role="button"
                  tabIndex={0}
                  className={`motion-lift w-full rounded-lg border border-border bg-card p-4 text-left md:p-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
                    view.image ? 'grid items-center gap-5 md:grid-cols-[220px_1fr]' : ''
                  }`}
                >
                  {view.image && (
                    <img src={view.image} alt={view.title} loading="lazy" decoding="async" className="aspect-[16/10] w-full rounded-md object-cover md:h-36 md:w-56" />
                  )}
                  <div className="flex flex-col justify-center">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <span className="w-fit rounded-full bg-bitcoin/10 px-3 py-1 text-xs font-medium text-bitcoin">
                        {view.category}
                      </span>
                      <span className="text-xs font-medium text-bitcoin">{view.date}</span>
                    </div>
                    <h3 className="text-xl font-semibold text-foreground md:text-2xl">{view.title}</h3>
                    <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
                      {view.detail}
                    </p>
                    <p className="mt-3 text-sm text-muted-foreground">{view.host}</p>
                    {view.link && (
                      <a
                        href={view.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={language === 'ko' ? `${view.title} 링크 열기` : `Open ${view.title} link`}
                        title={language === 'ko' ? '링크 열기' : 'Open link'}
                        onClick={(event) => event.stopPropagation()}
                        className="mt-3 inline-flex w-fit items-center gap-1 text-xs font-medium text-bitcoin transition-colors hover:text-bitcoin-light"
                      >
                        {language === 'ko' ? '더보기' : 'More'}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          )}

          {totalPages > 1 && (
            <div className="mt-8 flex justify-center gap-2">
              {Array.from({ length: totalPages }).map((_, index) => {
                const page = index + 1;
                return (
                  <button
                    key={page}
                    type="button"
                    onClick={() => setActivePage(page)}
                    className={`h-9 min-w-9 rounded-md border px-3 text-sm transition-colors ${
                      activePage === page
                        ? 'h-10 border-bitcoin bg-bitcoin text-bitcoin-foreground'
                        : 'h-10 border-border text-muted-foreground hover:border-bitcoin hover:text-bitcoin'
                    }`}
                  >
                    {page}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <Dialog open={Boolean(selectedItem)} onOpenChange={(open) => !open && setSelectedItem(null)}>
          {selectedItem && (
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>{getViewData(selectedItem).title}</DialogTitle>
              </DialogHeader>
              {getViewData(selectedItem).image && (
                <img
                  src={getViewData(selectedItem).image}
                  alt={getViewData(selectedItem).title}
                  className="aspect-video w-full rounded-md object-cover"
                />
              )}
              <div className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-3">
                <p>{language === 'ko' ? '분류' : 'Category'}: {getViewData(selectedItem).category}</p>
                <p>{language === 'ko' ? '주최' : 'Host'}: {getViewData(selectedItem).host}</p>
                <p>{language === 'ko' ? '날짜' : 'Date'}: {getViewData(selectedItem).date}</p>
              </div>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {getViewData(selectedItem).detail}
              </p>
              {getViewData(selectedItem).link && (
                <a
                  href={getViewData(selectedItem).link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="motion-press inline-flex w-fit items-center gap-1 rounded-md border border-bitcoin px-3 py-2 text-sm text-bitcoin hover:bg-bitcoin hover:text-bitcoin-foreground"
                >
                  {language === 'ko' ? '링크 열기' : 'Open Link'}
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              )}
            </DialogContent>
          )}
        </Dialog>
      </div>
    </section>
  );
};

export default EventHighlightsSection;
