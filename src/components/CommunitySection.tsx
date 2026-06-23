import { ExternalLink } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

const InstagramLogo = ({ className = '' }: { className?: string }) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
    <path
      fill="currentColor"
      d="M7.8 2h8.4A5.8 5.8 0 0 1 22 7.8v8.4a5.8 5.8 0 0 1-5.8 5.8H7.8A5.8 5.8 0 0 1 2 16.2V7.8A5.8 5.8 0 0 1 7.8 2Zm0 2A3.8 3.8 0 0 0 4 7.8v8.4A3.8 3.8 0 0 0 7.8 20h8.4a3.8 3.8 0 0 0 3.8-3.8V7.8A3.8 3.8 0 0 0 16.2 4H7.8Zm4.2 3.1a4.9 4.9 0 1 1 0 9.8 4.9 4.9 0 0 1 0-9.8Zm0 2a2.9 2.9 0 1 0 0 5.8 2.9 2.9 0 0 0 0-5.8Zm5.1-2.3a1.1 1.1 0 1 1-2.2 0 1.1 1.1 0 0 1 2.2 0Z"
    />
  </svg>
);

const XLogo = ({ className = '' }: { className?: string }) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
    <path
      fill="currentColor"
      d="M18.9 2.8h3.3l-7.2 8.3 8.5 10.1h-6.6l-5.2-6.1-5.9 6.1H2.5l7.7-8.7-8.1-9.7h6.8l4.7 5.6 5.3-5.6Zm-1.2 16.6h1.8L7.9 4.5H6L17.7 19.4Z"
    />
  </svg>
);

const NaverBlogLogo = ({ className = '' }: { className?: string }) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
    <path
      fill="currentColor"
      d="M4.6 3.5h14.8A3.6 3.6 0 0 1 23 7.1v7.2a3.6 3.6 0 0 1-3.6 3.6H12l-4.6 2.8v-2.8H4.6A3.6 3.6 0 0 1 1 14.3V7.1a3.6 3.6 0 0 1 3.6-3.6Z"
    />
    <text
      x="12"
      y="12.4"
      textAnchor="middle"
      dominantBaseline="middle"
      fontSize="6.7"
      fontWeight="900"
      fill="hsl(var(--background))"
      fontFamily="Arial, sans-serif"
    >
      ₿log
    </text>
  </svg>
);

const DiscordLogo = ({ className = '' }: { className?: string }) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
    <path
      fill="currentColor"
      d="M19.5 5.3A17.2 17.2 0 0 0 15.3 4l-.2.4-.3.8a15.8 15.8 0 0 0-5.6 0 8.2 8.2 0 0 0-.5-1.2 17.2 17.2 0 0 0-4.2 1.3C1.8 9.4 1.1 13.4 1.5 17.4A17 17 0 0 0 6.6 20l1.1-1.8c-.6-.2-1.2-.5-1.8-.9l.4-.3a12.2 12.2 0 0 0 11.4 0l.4.3c-.6.4-1.2.7-1.8.9l1.1 1.8a17 17 0 0 0 5.1-2.6c.5-4.6-.8-8.5-3-12.1ZM8.6 15.1c-1 0-1.8-.9-1.8-2s.8-2 1.8-2 1.8.9 1.8 2-.8 2-1.8 2Zm6.8 0c-1 0-1.8-.9-1.8-2s.8-2 1.8-2 1.8.9 1.8 2-.8 2-1.8 2Z"
    />
  </svg>
);

const CommunitySection = () => {
  const { language } = useLanguage();

  const content = {
    ko: {
      title: '커뮤니티',
      subtitle: '비트코인 센터 서울의 소식과 커뮤니티 채널을 확인하세요.',
      channels: [
        {
          name: 'Instagram',
          href: 'https://www.instagram.com/bitcoincenterseoul/',
          icon: InstagramLogo,
        },
        {
          name: 'X',
          href: 'https://x.com/BtcCtrSeoul',
          icon: XLogo,
        },
        {
          name: '네이버 블로그',
          href: 'https://blog.naver.com/coconut_btc',
          icon: NaverBlogLogo,
        },
        {
          name: 'Discord',
          href: 'https://discord.gg/s3T9gURJr7',
          icon: DiscordLogo,
        },
      ],
    },
    en: {
      title: 'Community',
      subtitle: 'Follow Bitcoin Center Seoul updates and community channels.',
      channels: [
        {
          name: 'Instagram',
          href: 'https://www.instagram.com/bitcoincenterseoul/',
          icon: InstagramLogo,
        },
        {
          name: 'X',
          href: 'https://x.com/BtcCtrSeoul',
          icon: XLogo,
        },
        {
          name: 'Naver Blog',
          href: 'https://blog.naver.com/coconut_btc',
          icon: NaverBlogLogo,
        },
        {
          name: 'Discord',
          href: 'https://discord.gg/s3T9gURJr7',
          icon: DiscordLogo,
        },
      ],
    },
  };

  return (
    <section id="community" className="py-20 bg-card">
      <div className="container mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-foreground to-bitcoin bg-clip-text text-transparent">
            {content[language].title}
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            {content[language].subtitle}
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {content[language].channels.map((channel) => (
            <a
              key={channel.name}
              href={channel.href}
              target="_blank"
              rel="noopener noreferrer"
              className="group rounded-lg border border-border bg-background p-6 text-center shadow-lg transition-all duration-300 hover:border-bitcoin/50 hover:shadow-xl"
            >
              <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-lg bg-bitcoin/10 text-bitcoin transition-colors group-hover:bg-bitcoin group-hover:text-bitcoin-foreground">
                <channel.icon className="h-8 w-8" />
              </div>
              <div className="flex items-center justify-center gap-2">
                <h3 className="text-lg font-semibold text-foreground">
                  {channel.name}
                </h3>
                <ExternalLink className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-bitcoin" />
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
};

export default CommunitySection;
