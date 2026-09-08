import { ExternalLink, MapPin, Clock } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import EventScheduleModal from './EventScheduleModal';

const HeroSection = () => {
  const { language } = useLanguage();
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    video.pause();
    video.removeAttribute('autoplay');
  }, []);

  const content = {
    ko: {
      subtitle: '비트코이너를 위한 공간',
      address: '서울시 마포구 신촌로2안길 30 2층',
      googleMap: '구글 지도',
      hours: '12:00 - 20:00 (연중무휴, 공휴일 제외, 대관시 사용 불가)',
    },
    en: {
      subtitle: "A space for Bitcoiners",
      address: '30, Sinchon-ro 2an-gil, Mapo-gu, Seoul, 2F',
      googleMap: 'Google Maps',
      hours: '12:00 - 20:00 (Mon-Sun, except holidays)',
    }
  };

  return (
    <section className="bg-background pt-24 pb-16 md:pt-28 md:pb-24">
      <div className="container mx-auto px-6">
        <div className="relative mx-auto max-w-5xl overflow-hidden rounded-lg border border-border bg-card shadow-2xl">
          <div className="relative aspect-video">
            <video
              ref={videoRef}
              src="https://bitcoin-center-seoul.s3.ap-northeast-2.amazonaws.com/BCS_480p.mov"
              poster="/images/thumnail/IMG_6227.jpg"
              autoPlay
              muted
              loop
              playsInline
              aria-label="Bitcoin Center Seoul"
              className="animate-hero-video-zoom-out absolute inset-0 h-full w-full object-cover"
            />
          </div>
          <div className="motion-enter border-t border-border bg-card px-4 py-6 text-center md:px-8 md:py-8">
            <h1 className="max-w-3xl mx-auto text-3xl font-semibold leading-tight tracking-tight text-foreground [overflow-wrap:anywhere] md:text-5xl">
              {content[language].subtitle}
            </h1>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div className="flex flex-col items-center gap-2 md:border-r md:border-border">
                <div className="flex items-center gap-3">
                  <MapPin className="h-5 w-5 flex-shrink-0 text-bitcoin" />
                  <span className="text-base leading-relaxed text-foreground">{content[language].address}</span>
                </div>
                <a
                  href="https://maps.app.goo.gl/n143j19LYrx3g8UF6"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-bitcoin transition-colors hover:text-bitcoin-light"
                >
                  {content[language].googleMap}
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>
              <div className="flex flex-col items-center gap-2">
                <div className="flex items-center justify-center gap-3">
                  <Clock className="h-5 w-5 flex-shrink-0 text-bitcoin" />
                  <span className="text-sm leading-relaxed text-foreground lg:text-base">{content[language].hours}</span>
                </div>
                <EventScheduleModal triggerStyle="link" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
