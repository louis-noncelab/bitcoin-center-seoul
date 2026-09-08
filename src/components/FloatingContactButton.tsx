import { Mail, MessageCircle, Phone, X } from 'lucide-react';
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
    <div className="fixed z-50 flex flex-col items-end gap-3 bottom-[max(1.5rem,env(safe-area-inset-bottom))] right-[max(1.5rem,env(safe-area-inset-right))]">
      {open && (
        <div id="contact-panel" className="motion-panel w-64 overflow-hidden rounded-lg border border-border bg-background shadow-2xl">
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
        aria-expanded={open}
        aria-controls="contact-panel"
        aria-label={open ? (language === 'ko' ? '닫기' : 'Close') : content[language].label}
        onClick={() => setOpen((current) => !current)}
        className="motion-press flex h-12 w-12 items-center justify-center rounded-full border border-bitcoin/40 bg-bitcoin text-bitcoin-foreground shadow-xl hover:bg-bitcoin/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        {open ? (
          <X className="h-5 w-5" />
        ) : (
          <MessageCircle className="h-5 w-5" />
        )}
      </button>
    </div>
  );
};

export default FloatingContactButton;
