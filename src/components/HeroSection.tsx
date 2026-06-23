import { ExternalLink, MapPin, Clock } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import EventScheduleModal from './EventScheduleModal';

const HeroSection = () => {
  const { language } = useLanguage();

  const content = {
    ko: {
      subtitle: '비트코이너를 위한 공간',
      address: '서울시 마포구 신촌로2안길 30 2층',
      googleMap: '구글 지도',
      hours: '12:00 - 20:00 (연중무휴, 공휴일 제외, 대관시 사용 불가)',
    },
    en: {
      subtitle: "A space for Bitcoiners",
      address: '30, Sinchon-ro 2an-gil, Mapo-gu, Seoul,2F',
      googleMap: 'Google Maps',
      hours: '12:00 - 20:00 (Mon-Sun, except holidays)',
    }
  };

  return (
    <section className="bg-background pt-28 pb-12">
      <div className="container mx-auto px-6">
        <div className="relative mx-auto max-w-5xl overflow-hidden rounded-lg border border-border bg-card shadow-2xl">
          <div className="relative aspect-[4/5] md:aspect-video">
          <video
            src="https://bitcoin-center-seoul.s3.ap-northeast-2.amazonaws.com/BCS_480p.mov"
            poster="/images/thumnail/IMG_6227.jpg"
            autoPlay
            muted
            loop
            playsInline
            aria-label="Bitcoin Center Seoul"
            className="animate-hero-video-zoom-out absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/30 to-transparent" />

          <div className="absolute inset-x-0 bottom-0 flex flex-col items-center p-4 text-center md:p-6">
            <p className="mb-4 text-2xl font-semibold leading-tight text-foreground drop-shadow-lg md:text-4xl">
              {content[language].subtitle}
            </p>

            <div className="grid w-full overflow-hidden rounded-lg border border-white/15 bg-background/78 text-left backdrop-blur-md md:grid-cols-2">
              <div className="flex flex-col items-center gap-2 border-b border-white/10 p-4 text-center md:border-b-0 md:border-r">
                <div className="flex items-center gap-3">
                  <MapPin className="h-5 w-5 flex-shrink-0 text-bitcoin" />
                  <span className="text-base leading-relaxed text-foreground" dangerouslySetInnerHTML={{ __html: content[language].address }} />
                </div>
                <a
                  href="https://maps.app.goo.gl/n143j19LYrx3g8UF6"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-bitcoin hover:text-bitcoin-light transition-colors"
                >
                  {content[language].googleMap}
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>
              <div className="flex flex-col items-center gap-2 p-4 text-center">
                <div className="flex items-center justify-center gap-3">
                  <Clock className="h-5 w-5 flex-shrink-0 text-bitcoin" />
                  <span className="text-sm leading-relaxed text-foreground md:whitespace-nowrap lg:text-base" dangerouslySetInnerHTML={{ __html: content[language].hours }} />
                </div>
                <EventScheduleModal triggerStyle="link" />
              </div>
            </div>
          </div>
        </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
