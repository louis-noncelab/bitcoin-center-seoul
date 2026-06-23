import { MapPin } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import Logo from './Logo';

const Footer = () => {
  const { language } = useLanguage();

  const content = {
    ko: {
      description: '비트코인 센터 서울은 비트코이너를 위한 공간입니다.',
      body: '전시, 교육, 하드월렛 체험, 커뮤니티 밋업, 라운지와 갤러리가 함께 있는 서울의 비트코인 허브입니다.',
      address: '서울시 마포구 신촌로2안길 30 2층',
      map: '구글 지도',
      scheduleAdmin: '일정관리',
      highlightsAdmin: '하이라이트',
      copyright: '© 2025 NonceLab Inc. and Saturday Block. All rights reserved.',
    },
    en: {
      description: 'Bitcoin Center Seoul is a space for Bitcoiners.',
      body: 'A Bitcoin hub in Seoul for exhibitions, education, hardware wallet experiences, community meetups, lounge, and gallery.',
      address: '30, Sinchon-ro 2an-gil, Mapo-gu, Seoul, 2F',
      map: 'Google Maps',
      scheduleAdmin: 'Schedule Admin',
      highlightsAdmin: 'Highlights Admin',
      copyright: '© 2025 NonceLab Inc. and Saturday Block. All rights reserved.',
    },
  };

  return (
    <footer className="bg-card border-t border-border py-16">
      <div className="container mx-auto px-6 text-center">
        <div className="flex justify-center mb-6">
          <Logo size="md" />
        </div>
        <h2 className="text-2xl font-bold text-foreground mb-4">
          {content[language].description}
        </h2>
        <p className="text-muted-foreground leading-relaxed max-w-2xl mx-auto mb-6">
          {content[language].body}
        </p>
        <div className="flex flex-col items-center gap-2 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-bitcoin" />
            <span>{content[language].address}</span>
          </div>
          <a
            href="https://maps.app.goo.gl/n143j19LYrx3g8UF6"
            target="_blank"
            rel="noopener noreferrer"
            className="text-bitcoin hover:text-bitcoin-light transition-colors"
          >
            {content[language].map}
          </a>
        </div>

        <div className="border-t border-border mt-12 pt-8">
          <p className="text-sm text-muted-foreground">
            {content[language].copyright}
          </p>
          <div className="mt-4 flex justify-center gap-5 text-xs text-muted-foreground">
            <a
              href="/admin/auth?redirect=/admin/events"
              className="hover:text-bitcoin transition-colors"
            >
              {content[language].scheduleAdmin}
            </a>
            <a
              href="/admin/auth?redirect=/admin/highlights"
              className="hover:text-bitcoin transition-colors"
            >
              {content[language].highlightsAdmin}
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
