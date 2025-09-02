import { Button } from '@/components/ui/button';
import { Globe } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import Logo from './Logo';

const Navigation = () => {
  const { language, toggleLanguage } = useLanguage();

  const menuItems = {
    ko: ['소개', '주요 역할', '가격 정보'],
    en: ['About', 'Services', 'Pricing']
  };

  const scrollToSection = (index: number) => {
    const sections = ['about', 'services', 'pricing'];
    const element = document.getElementById(sections[index]);
    element?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <nav className="fixed top-0 w-full bg-background/80 backdrop-blur-lg border-b border-border z-50">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <Logo size="lg" />

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