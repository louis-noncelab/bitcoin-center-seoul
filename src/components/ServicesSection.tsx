import { useLanguage } from '@/contexts/LanguageContext';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { useReveal } from '@/hooks/use-reveal';
import EducationCoursesModal from './EducationCoursesModal';
import MeetupsModal from './MeetupsModal';

const ServicesSection = () => {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const revealRef = useReveal<HTMLElement>();
  const [isEducationModalOpen, setIsEducationModalOpen] = useState(false);
  const [isMeetupsModalOpen, setIsMeetupsModalOpen] = useState(false);

  const content = {
    ko: {
      eyebrow: 'ACTIVITIES',
      title: '활동',
      subtitle: '다양한 비트코인 관련 경험을 한 곳에서 만나보세요.',
      services: [
        {
          title: '전시',
          description: '비트코인 관련 굿즈 및 관련 용품',
          image: '/images/what-we-do/exhibition.jpeg',
          details: '다양한 비트코인 굿즈와 하드웨어 전시'
        },
        {
          title: '체험',
          description: '하드월렛 등 비트코인 관련 기기 체험',
          image: '/images/what-we-do/experience.jpeg',
          details: '하드웨어 월렛과 비트코인 기기 직접 체험'
        },
        {
          title: '교육',
          description: '비트코인 관련 교육',
          image: '/images/what-we-do/education.png',
          details: '비트코인 기초부터 고급까지 체계적 교육'
        },
        {
          title: '커뮤니티',
          description: '각종 커뮤니티 활동',
          image: '/images/what-we-do/community.jpg',
          details: '비트코인 관련 밋업과 이벤트 개최'
        },
        {
          title: '라운지',
          description: '카페 라운지',
          image: '/images/what-we-do/lounge.jpeg',
          details: '편안한 카페 라운지에서 네트워킹과 휴식'
        },
        {
          title: '갤러리',
          description: '비트코인 관련 예술작품 전시',
          image: '/images/what-we-do/gallery.jpeg',
          details: '비트코인에서 영감을 받은 예술작품 전시'
        },
        {
          title: '판매',
          description: '각종 비트코인 관련 용품 판매',
          image: '/images/what-we-do/retail.jpeg',
          details: '비트코인 관련 제품과 굿즈 판매 공간'
        },
        {
          title: '코워킹',
          description: '코워킹 스페이스 제공',
          image: '/images/what-we-do/coworking.png',
          details: '비트코인 기업가를 위한 전문 코워킹 공간'
        }
      ]
    },
    en: {
      eyebrow: 'ACTIVITIES',
      title: 'Activities',
      subtitle: 'Discover a wide range of Bitcoin experiences in one place.',
      services: [
        {
          title: 'Exhibition',
          description: 'Bitcoin merchandise and related equipment',
          image: '/images/what-we-do/exhibition.jpeg',
          details: 'Exhibition of various Bitcoin goods and hardware'
        },
        {
          title: 'Experience',
          description: 'Hands-on experience with hardware wallets and Bitcoin devices',
          image: '/images/what-we-do/experience.jpeg',
          details: 'Direct experience with hardware wallets and Bitcoin devices'
        },
        {
          title: 'Education',
          description: 'Comprehensive Bitcoin education and workshops',
          image: '/images/what-we-do/education.png',
          details: 'Systematic education from Bitcoin basics to advanced'
        },
        {
          title: 'Community',
          description: 'Various community activities',
          image: '/images/what-we-do/community.jpg',
          details: 'Bitcoin community meetups and events'
        },
        {
          title: 'Lounge',
          description: 'Comfortable cafe lounge for networking and relaxation',
          image: '/images/what-we-do/lounge.jpeg',
          details: 'Comfortable cafe lounge for networking and relaxation'
        },
        {
          title: 'Gallery',
          description: 'Gallery showcasing Bitcoin-inspired artwork',
          image: '/images/what-we-do/gallery.jpeg',
          details: 'Gallery showcasing Bitcoin-inspired artwork'
        },
        {
          title: 'Retail',
          description: 'Retail space for Bitcoin-related products and merchandise',
          image: '/images/what-we-do/retail.jpeg',
          details: 'Retail space for Bitcoin-related products and goods'
        },
        {
          title: 'Coworking',
          description: 'Professional coworking space for Bitcoin entrepreneurs',
          image: '/images/what-we-do/coworking.png',
          details: 'Professional coworking space for Bitcoin entrepreneurs'
        }
      ]
    }
  };

  const handleServiceClick = (title: string) => {
    if (title === '체험' || title === 'Experience') {
      navigate('/walletExperence');
      return;
    }

    if (title === '교육' || title === 'Education') {
      setIsEducationModalOpen(true);
      return;
    }

    if (title === '커뮤니티' || title === 'Community') {
      setIsMeetupsModalOpen(true);
    }
  };

  const hasAction = (title: string) => {
    return ['체험', 'Experience', '교육', 'Education', '커뮤니티', 'Community'].includes(title);
  };

  return (
    <section id="services" ref={revealRef} className="motion-reveal scroll-mt-[72px] bg-background py-16 md:py-24">
      <div className="container mx-auto px-6">
        <div className="mb-10 text-center md:mb-14">
          <p className="mb-3 text-xs font-semibold tracking-[0.2em] text-bitcoin">
            {content[language].eyebrow}
          </p>
          <h2 className="mb-4 pb-1 text-3xl font-bold text-foreground md:text-4xl">
            {content[language].title}
          </h2>
          <p className="mx-auto max-w-2xl text-base text-muted-foreground md:text-lg">
            {content[language].subtitle}
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {content[language].services.map((service, index) => {
            const clickable = hasAction(service.title);

            return (
              <div
                key={index}
                role={clickable ? 'button' : undefined}
                tabIndex={clickable ? 0 : undefined}
                onClick={clickable ? () => handleServiceClick(service.title) : undefined}
                onKeyDown={
                  clickable
                    ? (event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          handleServiceClick(service.title);
                        }
                      }
                    : undefined
                }
                className={`overflow-hidden rounded-lg border border-border bg-card ${
                  clickable
                    ? 'motion-lift group cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background'
                    : 'cursor-default'
                }`}
              >
                <div className="aspect-[4/3] overflow-hidden bg-muted">
                  <img
                    src={service.image}
                    alt={service.title}
                    loading="lazy"
                    decoding="async"
                    className={`h-full w-full object-cover${
                      clickable ? ' transition-transform duration-500 group-hover:scale-105' : ''
                    }`}
                  />
                </div>
                <div className="flex items-start justify-between gap-2 bg-card p-4">
                  <div>
                    <h3 className="mb-1 text-lg font-semibold text-foreground">
                      {service.title}
                    </h3>
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      {service.description}
                    </p>
                  </div>
                  {clickable && (
                    <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-bitcoin" />
                  )}
                </div>
              </div>
            );
          })}
        </div>
        <EducationCoursesModal
          open={isEducationModalOpen}
          onOpenChange={setIsEducationModalOpen}
        />
        <MeetupsModal
          open={isMeetupsModalOpen}
          onOpenChange={setIsMeetupsModalOpen}
        />
      </div>
    </section>
  );
};

export default ServicesSection;
