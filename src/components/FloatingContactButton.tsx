import { Mail, MessageCircle, Phone, X, Zap } from 'lucide-react';
import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';

const FloatingContactButton = () => {
  const { language } = useLanguage();
  const [open, setOpen] = useState(false);

  const content = {
    ko: {
      label: '문의하기',
      kakao: '카카오톡 문의하기',
      email: 'hello@noncelab.com',
      phone: '+82-2-702-1718',
    },
    en: {
      label: 'Inquiry',
      kakao: 'KakaoTalk Inquiry',
      email: 'hello@noncelab.com',
      phone: '+82-2-702-1718',
    },
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      {open && (
        <div className="w-64 overflow-hidden rounded-lg border border-border bg-background shadow-2xl">
          <a
            href="https://pf.kakao.com/_HjxaxaG"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 border-b border-border px-4 py-3 text-sm text-foreground transition-colors hover:bg-card hover:text-bitcoin"
          >
            <MessageCircle className="h-4 w-4 text-bitcoin" />
            {content[language].kakao}
          </a>
          <a
            href="mailto:hello@noncelab.com"
            className="flex items-center gap-3 border-b border-border px-4 py-3 text-sm text-foreground transition-colors hover:bg-card hover:text-bitcoin"
          >
            <Mail className="h-4 w-4 text-bitcoin" />
            {content[language].email}
          </a>
          <a
            href="tel:+82-2-702-1718"
            className="flex items-center gap-3 px-4 py-3 text-sm text-foreground transition-colors hover:bg-card hover:text-bitcoin"
          >
            <Phone className="h-4 w-4 text-bitcoin" />
            {content[language].phone}
          </a>
        </div>
      )}

      <button
        type="button"
        aria-label={content[language].label}
        onClick={() => setOpen((current) => !current)}
        className="group flex h-16 w-16 items-center justify-center rounded-full border border-bitcoin/40 bg-bitcoin text-bitcoin-foreground shadow-2xl transition-all hover:bg-bitcoin-dark focus:outline-none focus:ring-2 focus:ring-bitcoin focus:ring-offset-2 focus:ring-offset-background"
      >
        {open ? (
          <X className="h-7 w-7" />
        ) : (
          <span className="relative flex h-9 w-9 items-center justify-center">
            <MessageCircle className="absolute h-9 w-9" strokeWidth={2.4} />
            <Zap className="relative h-4 w-4 fill-current" strokeWidth={2.6} />
          </span>
        )}
      </button>
    </div>
  );
};

export default FloatingContactButton;
