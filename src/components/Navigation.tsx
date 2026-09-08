import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Globe, Menu, X } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useLocation, useNavigate } from 'react-router-dom';
import Logo from './Logo';

const Navigation = () => {
  const { language, toggleLanguage } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const menuItems = {
    ko: ['이벤트', '하이라이트', '활동', '커뮤니티'],
    en: ['Events', 'Highlights', 'Activities', 'Community']
  };

  const scrollToSection = (index: number) => {
    const sections = ['events', 'highlights', 'services', 'community'];
    const sectionId = sections[index];

    setMenuOpen(false);
    if (location.pathname !== '/') {
      navigate(`/#${sectionId}`);
      return;
    }

    const element = document.getElementById(sectionId);
    if (element) {
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      element.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
    }
  };

  const goHome = () => {
    setMenuOpen(false);
    if (location.pathname !== '/') {
      navigate('/');
      return;
    }

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({
      top: 0,
      behavior: reduce ? 'auto' : 'smooth'
    });
  };

  return (
    <nav className="fixed top-0 w-full bg-background/80 backdrop-blur-lg border-b border-border z-50">
      <div className="container mx-auto px-6 py-3 md:py-4">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={goHome}
            aria-label="Home"
            className="rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <Logo size="md" className="h-9 md:h-12 [&_img]:h-9 md:[&_img]:h-12" />
          </button>

          <div className="flex items-center gap-2 md:gap-8">
            <div className="hidden md:flex items-center space-x-8">
              {menuItems[language].map((item, index) => (
                <button
                  key={item}
                  onClick={() => scrollToSection(index)}
                  className="rounded-sm text-foreground transition-colors duration-200 hover:text-bitcoin focus-visible:outline-none focus-visible:text-bitcoin focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                >
                  {item}
                </button>
              ))}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={toggleLanguage}
              className="border-bitcoin text-bitcoin hover:bg-bitcoin hover:text-bitcoin-foreground"
            >
              <Globe className="w-4 h-4 mr-2" />
              {language === 'ko' ? 'EN' : '한글'}
            </Button>

            <Button
              type="button"
              variant="outline"
              size="icon"
              className="md:hidden border-border"
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((open) => !open)}
            >
              {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>
      </div>
      {menuOpen && (
        <div className="motion-enter md:hidden border-t border-border bg-background/95 px-6 py-3 flex flex-col gap-1">
          {menuItems[language].map((item, index) => (
            <button
              key={item}
              type="button"
              onClick={() => scrollToSection(index)}
              className="w-full rounded-md py-3 text-left text-base text-foreground hover:text-bitcoin focus-visible:outline-none focus-visible:text-bitcoin focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              {item}
            </button>
          ))}
        </div>
      )}
    </nav>
  );
};

export default Navigation;
