import { useEffect, useMemo, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ExternalLink } from 'lucide-react';

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
  });

  return (
    <section id="highlights" className="bg-background py-20">
      <div className="container mx-auto px-6">
        <div className="text-center mb-12">
          <h2 className="mb-6 pb-1 text-4xl font-bold leading-tight bg-gradient-to-r from-foreground to-bitcoin bg-clip-text text-transparent md:text-5xl">
            {language === 'ko' ? '하이라이트' : 'Highlights'}
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            {language === 'ko'
              ? '실제 활동의 순간들을 확인해보세요.'
              : 'Explore real moments from past Bitcoin Center Seoul activities.'}
          </p>
        </div>

        <div className="mb-8 flex flex-wrap justify-center gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => {
                setActiveTab(tab.value);
              }}
              className={`rounded-full border px-5 py-2 text-sm font-medium transition-all ${
                activeTab === tab.value
                  ? 'border-bitcoin bg-bitcoin text-bitcoin-foreground'
                  : 'border-border text-muted-foreground hover:border-bitcoin hover:text-bitcoin'
              }`}
            >
              {tab[language]}
            </button>
          ))}
        </div>

        <div className="mx-auto max-w-4xl rounded-lg border border-border bg-card p-4 shadow-lg md:p-5">
          {filtered.length === 0 ? (
            <div className="rounded-md border border-border bg-background p-8 text-center text-sm text-muted-foreground">
              {language === 'ko' ? '등록된 하이라이트가 없습니다.' : 'No highlights have been added yet.'}
            </div>
          ) : (
          <div className="space-y-3 transition-all duration-300">
            {pagedItems.map((item, index) => {
              const view = getViewData(item);

              return (
                <button
                  key={`${item.title}-${index}`}
                  type="button"
                  onClick={() => setSelectedItem(item)}
                  className="w-full rounded-md border border-border bg-background p-4 text-left transition-all hover:border-bitcoin/50 hover:bg-card/70"
                >
                  <div className="flex flex-col justify-center">
                    <div className="mb-3 flex flex-wrap items-center gap-2">
                      <span className="w-fit rounded-full bg-bitcoin/10 px-3 py-1 text-xs font-medium text-bitcoin">
                        {view.category}
                      </span>
                      {view.link && (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-bitcoin">
                          {language === 'ko' ? '링크 첨부' : 'Link attached'}
                          <ExternalLink className="h-3 w-3" />
                        </span>
                      )}
                    </div>
                    <h3 className="text-lg font-semibold text-foreground md:text-xl">{view.title}</h3>
                    <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
                      {view.detail}
                    </p>
                    <div className="mt-3 grid gap-1 text-sm text-muted-foreground sm:grid-cols-2">
                      <p>Host: {view.host}</p>
                      <p>Date: {view.date}</p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
          )}

          {totalPages > 1 && (
            <div className="mt-5 flex justify-center gap-2">
              {Array.from({ length: totalPages }).map((_, index) => {
                const page = index + 1;
                return (
                  <button
                    key={page}
                    type="button"
                    onClick={() => setActivePage(page)}
                    className={`h-9 min-w-9 rounded-md border px-3 text-sm transition-colors ${
                      activePage === page
                        ? 'border-bitcoin bg-bitcoin text-bitcoin-foreground'
                        : 'border-border text-muted-foreground hover:border-bitcoin hover:text-bitcoin'
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
              <div className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-3">
                <p>Category: {getViewData(selectedItem).category}</p>
                <p>Host: {getViewData(selectedItem).host}</p>
                <p>Date: {getViewData(selectedItem).date}</p>
              </div>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {getViewData(selectedItem).detail}
              </p>
              {getViewData(selectedItem).link && (
                <a
                  href={getViewData(selectedItem).link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex w-fit items-center gap-1 rounded-md border border-bitcoin px-3 py-2 text-sm text-bitcoin transition-colors hover:bg-bitcoin hover:text-bitcoin-foreground"
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
