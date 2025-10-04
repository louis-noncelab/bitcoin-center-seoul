import React from 'react';
import { Button } from '@/components/ui/button';
import { MapPin, Clock, Instagram, MessageCircle } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import Logo from './Logo';
import EventScheduleModal from './EventScheduleModal';

const HeroSection = () => {
  const { language } = useLanguage();

  const content = {
    ko: {
      subtitle: '비트코이너를 위한 공간',
      address: '서울시 마포구 신촌로2안길 30 2층',
      hours: '12:00 - 20:00 (연중무휴, 공휴일 제외, 대관시 사용 불가)',
      learnButton: '자세히 보기'
    },
    en: {
      subtitle: "A space for Bitcoiners",
      address: '30, Sinchon-ro 2an-gil, Mapo-gu, Seoul,2F',
      hours: '12:00 - 20:00 (Mon-Sun, except holidays)',
      learnButton: 'Learn More'
    }
  };

  // 순환하는 메인 이미지
  const [mainImageIndex, setMainImageIndex] = React.useState(0);
  const [nextImageIndex, setNextImageIndex] = React.useState(1);
  const [isTransitioning, setIsTransitioning] = React.useState(false);
  const mainImages = ['/images/main1.png', '/images/main2.png', '/images/main3.png'];

  React.useEffect(() => {
    const interval = setInterval(() => {
      if (isTransitioning) return;
      
      setIsTransitioning(true);
      
      // 다음 이미지 인덱스 미리 계산
      const nextIndex = (mainImageIndex + 1) % mainImages.length;
      setNextImageIndex(nextIndex);
      
      // 500ms 후 이미지 변경
      setTimeout(() => {
        setMainImageIndex(nextIndex);
        setIsTransitioning(false);
      }, 500);
    }, 8000);

    return () => clearInterval(interval);
  }, [mainImageIndex, isTransitioning]);
  return (
    <section className="min-h-screen bg-gradient-to-br from-background via-background to-card flex items-center justify-center relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,hsl(var(--bitcoin-orange)/0.1)_0%,transparent_50%)]" />
      
      <div className="container mx-auto px-6 py-20 text-center relative z-10">
        <div className="max-w-4xl mx-auto">
          {/* 순환하는 메인 이미지 */}
          <div className="text-center mb-2 relative">
            {/* 배경 이미지 (main0) */}
            <img 
              src="/images/main0.png" 
              alt="Background Main"
              className="mx-auto max-w-full h-auto absolute inset-0 opacity-100"
              style={{ maxHeight: '298px' }}
            />
            {/* 순환하는 메인 이미지들 */}
            <img 
              key={mainImageIndex}
              src={mainImages[mainImageIndex]} 
              alt={`Main ${mainImageIndex + 1}`}
              className="mx-auto max-w-full h-auto transition-opacity duration-1000 ease-in-out relative z-10 opacity-100"
              style={{ maxHeight: '300px' }}
            />
            {/* 다음 이미지 (크로스페이드용) */}
            {isTransitioning && (
              <img 
                key={`next-${nextImageIndex}`}
                src={mainImages[nextImageIndex]} 
                alt={`Next Main ${nextImageIndex + 1}`}
                className="mx-auto max-w-full h-auto transition-opacity duration-1000 ease-in-out absolute inset-0 opacity-0"
                style={{ maxHeight: '300px' }}
              />
            )}
          </div>
          
          {/* 로고 추가 */}
          <div className="flex justify-center mb-4">
            <img 
              src="/images/logo_kr.png" 
              alt="Bitcoin Center Seoul" 
              className="h-24 w-auto mx-auto"
              style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))' }}
            />
          </div>
          
          <p className="text-xl md:text-2xl text-muted-foreground mb-8 leading-relaxed">
            {content[language].subtitle}
            <br />
          </p>

          <div className="flex flex-col md:flex-row items-center justify-center gap-8 mb-6">
            <div className="flex items-center gap-3 text-muted-foreground">
              <MapPin className="w-5 h-5 text-bitcoin" />
              <span dangerouslySetInnerHTML={{ __html: content[language].address }} />
            </div>
            <div className="flex items-center gap-3 text-muted-foreground">
              <Clock className="w-5 h-5 text-bitcoin" />
              <span dangerouslySetInnerHTML={{ __html: content[language].hours }} />
            </div>
          </div>

          <div className="flex items-center justify-center gap-6 mb-8">
            <div className="flex items-center gap-3 text-muted-foreground">
              <Instagram className="w-5 h-5 text-bitcoin" />
              <a 
                href="https://www.instagram.com/bitcoincenterseoul/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="hover:text-bitcoin transition-colors"
              >
                @bitcoincenterseoul
              </a>
            </div>
            <div className="flex items-center gap-3 text-muted-foreground">
              <MessageCircle className="w-5 h-5 text-bitcoin" />
              <a 
                href="https://www.threads.com/@bitcoincenterseoul" 
                target="_blank" 
                rel="noopener noreferrer"
                className="hover:text-bitcoin transition-colors"
              >
                @bitcoincenterseoul
              </a>
            </div>
          </div>

          <div className="flex justify-center mb-12">
            <EventScheduleModal />
          </div>


        </div>
      </div>
    </section>
  );
};

export default HeroSection;