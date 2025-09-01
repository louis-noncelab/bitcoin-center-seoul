import { Button } from '@/components/ui/button';
import { Globe } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

const Navigation = () => {
  const { language, toggleLanguage } = useLanguage();

  const menuItems = {
    ko: ['소개', '주요 역할', '가격 정보', '대관 예약'],
    en: ['About', 'Services', 'Pricing', 'Booking']
  };

  const scrollToSection = (index: number) => {
    const sections = ['about', 'services', 'pricing', 'booking'];
    const element = document.getElementById(sections[index]);
    element?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <nav className="fixed top-0 w-full bg-background/80 backdrop-blur-lg border-b border-border z-50">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-r from-bitcoin to-bitcoin-dark rounded-lg flex items-center justify-center">
              <span className="text-bitcoin-foreground font-bold text-sm">₿</span>
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-bitcoin to-bitcoin-light bg-clip-text text-transparent">
              {language === 'ko' ? '비트코인 센터 서울' : 'Bitcoin Center Seoul'}
            </span>
          </div>

          <div className="hidden md:flex items-center space-x-8">
            {menuItems[language].map((item, index) => (
              <button
                key={item}
                onClick={() => scrollToSection(index)}
                className="text-foreground hover:text-bitcoin transition-colors duration-200"
              >
                {item}
              </button>
            ))}
            
            <Button
              variant="outline"
              size="sm"
              onClick={toggleLanguage}
              className="border-bitcoin text-bitcoin hover:bg-bitcoin hover:text-bitcoin-foreground"
            >
              <Globe className="w-4 h-4 mr-2" />
              {language === 'ko' ? 'EN' : '한글'}
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;