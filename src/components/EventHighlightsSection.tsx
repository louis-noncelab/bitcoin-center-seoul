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
  host?: string;
  hostEn?: string;
  meta: string;
  metaEn: string;
  description: string;
  descriptionEn: string;
  image: string;
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

const defaultHighlights: HighlightRecord[] = [
  {
    title: '비트코인 개발자 밋업',
    titleEn: 'Bitcoin Developer Meetup',
    category: '밋업',
    categoryEn: 'Meetup',
    date: '2026.04.19',
    host: '비트코인 센터 서울',
    hostEn: 'Bitcoin Center Seoul',
    meta: '개발자 커뮤니티',
    metaEn: 'Developer Community',
    description: '비트코인 개발자들이 모여 기술 주제를 나누는 시간입니다.',
    descriptionEn: 'Bitcoin developers gather to discuss technical topics.',
    image: '/images/highlights/행사/비트코인 개발자 밋업.jpeg',
  },
  {
    title: '셀프 커스터디 강의',
    titleEn: 'Self-Custody Class',
    category: '강의',
    categoryEn: 'Class',
    date: '2026.03.27',
    host: 'Coconut',
    hostEn: 'Coconut',
    meta: '교육 프로그램',
    metaEn: 'Education Program',
    description: '비트코인을 스스로 안전하게 보관하는 방법을 배웁니다.',
    descriptionEn: 'Learn how to safely self-custody Bitcoin.',
    image: '/images/highlights/행사/1분 비트코인 셀프 커스터디 강의.png',
  },
  {
    title: 'Movie Night',
    titleEn: 'Bitcoin Movie Night',
    category: '행사',
    categoryEn: 'Event',
    date: '2026.03.08',
    host: 'Saturday Block',
    hostEn: 'Saturday Block',
    meta: '커뮤니티 행사',
    metaEn: 'Community Event',
    description: '비트코인과 관련된 영화를 함께 보고 이야기합니다.',
    descriptionEn: 'Watch Bitcoin-related films and discuss them together.',
    image: '/images/highlights/행사/MOBIE NIGHT.png',
  },
  {
    title: '비트코인 프로토콜 강의',
    titleEn: 'Bitcoin Protocol Course',
    category: '강의',
    categoryEn: 'Class',
    date: '2026.05.17',
    host: '비트코인 센터 서울',
    hostEn: 'Bitcoin Center Seoul',
    meta: '정규 교육',
    metaEn: 'Education',
    description: '비트코인의 구조와 프로토콜을 깊이 있게 학습합니다.',
    descriptionEn: 'Dive deeper into Bitcoin structure and protocol.',
    image: '/images/highlights/행사/5월 17일 비트코인 프로토콜 강의 3기.jpg',
  },
  {
    title: '리스펙 토크 콘서트',
    titleEn: 'Respect Talk Concert',
    category: '행사',
    categoryEn: 'Event',
    date: '2026.04.19',
    host: '리스펙',
    hostEn: 'Respect',
    meta: '토크 콘서트',
    metaEn: 'Talk Concert',
    description: '비트코인 커뮤니티와 함께 이야기를 나누는 행사입니다.',
    descriptionEn: 'A community event for Bitcoin conversations.',
    image: '/images/highlights/행사/리스펙 비트코인 토크 콘서트 2기.PNG',
  },
  {
    title: '코워킹 데이',
    titleEn: 'Coworking Day',
    category: '행사',
    categoryEn: 'Event',
    date: '2026.04.10',
    host: '비트코인 센터 서울',
    hostEn: 'Bitcoin Center Seoul',
    meta: '코워킹',
    metaEn: 'Coworking',
    description: '비트코이너들이 함께 일하고 교류하는 시간입니다.',
    descriptionEn: 'Bitcoiners work and connect together at the center.',
    image: '/images/highlights/코워킹/2026.04.10.png',
  },
];

const inferCategory = (item: HighlightRecord) => {
  const text = `${item.title} ${item.meta}`.toLowerCase();
  if (item.category) return item.category;
  if (text.includes('강의') || text.includes('교육') || text.includes('class') || text.includes('course')) return '강의';
  if (text.includes('밋업') || text.includes('meetup')) return '밋업';
  return '행사';
};

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
  const filtered = useMemo(
    () => activeTab === '전체' ? items : items.filter((item) => inferCategory(item) === activeTab),
    [activeTab, items]
  );
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pagedItems = filtered.slice((activePage - 1) * pageSize, activePage * pageSize);

  useEffect(() => {
    setActivePage(1);
    setSelectedItem(null);
  }, [activeTab, language]);

  const getViewData = (item: HighlightRecord) => ({
    title: language === 'ko' ? item.title : item.titleEn,
    date: item.date || item.meta,
    host: language === 'ko' ? (item.host || '비트코인 센터 서울') : (item.hostEn || 'Bitcoin Center Seoul'),
    detail: language === 'ko' ? item.description : item.descriptionEn,
    category: categoryLabels[inferCategory(item)]?.[language] || inferCategory(item),
    link: item.link || '',
  });

  return (
    <section id="highlights" className="bg-background py-20">
      <div className="container mx-auto px-6">
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-foreground to-bitcoin bg-clip-text text-transparent">
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
          <div className="space-y-3 transition-all duration-300">
            {pagedItems.map((item, index) => {
              const view = getViewData(item);

              return (
                <button
                  key={`${item.title}-${index}`}
                  type="button"
                  onClick={() => setSelectedItem(item)}
                  className="grid w-full gap-4 rounded-md border border-border bg-background p-3 text-left transition-all hover:border-bitcoin/50 hover:bg-card/70 md:grid-cols-[132px_1fr] md:p-4"
                >
                  <img src={item.image} alt={view.title} className="aspect-square w-full rounded-md object-cover md:h-32 md:w-32" />
                  <div className="flex flex-col justify-center">
                    <span className="mb-3 w-fit rounded-full bg-bitcoin/10 px-3 py-1 text-xs font-medium text-bitcoin">
                      {view.category}
                    </span>
                    <h3 className="text-lg font-semibold text-foreground md:text-xl">{view.title}</h3>
                    <div className="mt-3 grid gap-1 text-sm text-muted-foreground sm:grid-cols-2">
                      <p>Host: {view.host}</p>
                      <p>Date: {view.date}</p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

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
              <img src={selectedItem.image} alt={getViewData(selectedItem).title} className="aspect-video w-full rounded-md object-cover" />
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
