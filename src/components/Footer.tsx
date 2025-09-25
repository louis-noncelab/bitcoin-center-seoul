import { MapPin, Clock, Mail, Phone } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import Logo from './Logo';

const Footer = () => {
  const { language } = useLanguage();

  const content = {
    ko: {
      description: '비트코이너를 위한 공간',
      descriptionEn: "A Space for Bitcoiners.",
      contact: '연락처',
      address: '서울시 마포구 신촌로2안길 30 2층',
      hours: '12:00 - 20:00 (화-일)',
      email: 'hello@noncelab.com',
      kakao: '+82-2-702-1718',
      copyright: '© 2025 NonceLab Inc. All rights reserved.'
    },
    en: {
      description: "A Space for Bitcoiners.",
      descriptionEn: '비트코이너를 위한 공간',
      contact: 'Contact',
      address: '30, Sinchon-ro 2an-gil, Mapo-gu, Seoul, 2F',
      hours: '12:00 - 20:00 (Tue-Sun)',
      email: 'hello@noncelab.com',
      kakao: '+82-2-702-1718',
      copyright: '© 2025 NonceLab Inc. All rights reserved.'
    }
  };
  return (
    <footer className="bg-card border-t border-border py-16">
      <div className="container mx-auto px-6">
        <div className="grid md:grid-cols-3 gap-8">
          {/* Logo and Description */}
          <div className="md:col-span-2 pl-4">
            <div className="mb-6">
              <Logo size="md" />
            </div>
            <p className="text-muted-foreground leading-relaxed mb-6 text-left pl-4">
              {content[language].description}
            </p>
            <p className="text-sm text-muted-foreground text-left pl-4">
              {content[language].descriptionEn}
            </p>
          </div>

          {/* Contact Info */}
          <div>
            <h3 className="text-lg font-semibold text-foreground mb-4">{content[language].contact}</h3>
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <MapPin className="w-4 h-4 text-bitcoin mt-1 flex-shrink-0" />
                <span className="text-sm text-muted-foreground">
                  {content[language].address}
                </span>
              </li>
              <li className="flex flex-col gap-2 mt-3">
                <a 
                  href="https://maps.google.com/?q=서울시+마포구+신촌로2안길+30+2층"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center text-xs text-bitcoin hover:text-bitcoin-dark transition-colors"
                >
                  <MapPin className="w-3 h-3 mr-1" />
                  {language === 'ko' ? '구글 지도' : 'Google Maps'}
                </a>
              </li>
              <li className="flex items-start gap-3">
                <Clock className="w-4 h-4 text-bitcoin mt-1 flex-shrink-0" />
                <span className="text-sm text-muted-foreground">
                  {content[language].hours}
                </span>
              </li>
              <li className="flex items-start gap-3">
                <Mail className="w-4 h-4 text-bitcoin mt-1 flex-shrink-0" />
                <span className="text-sm text-muted-foreground">
                  {content[language].email}
                </span>
              </li>
              <li className="flex items-start gap-3">
                <Phone className="w-4 h-4 text-bitcoin mt-1 flex-shrink-0" />
                <a 
                  href="tel:+82-2-702-1718"
                  className="text-sm text-muted-foreground hover:text-bitcoin transition-colors"
                >
                  {content[language].kakao}
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-border mt-12 pt-8 text-center">
          <p className="text-sm text-muted-foreground">
            {content[language].copyright}
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;