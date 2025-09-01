import { MapPin, Clock, Mail, MessageCircle } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="bg-card border-t border-border py-16">
      <div className="container mx-auto px-6">
        <div className="grid md:grid-cols-4 gap-8">
          {/* Logo and Description */}
          <div className="md:col-span-2">
            <div className="flex items-center space-x-2 mb-4">
              <div className="w-8 h-8 bg-gradient-to-r from-bitcoin to-bitcoin-dark rounded-lg flex items-center justify-center">
                <span className="text-bitcoin-foreground font-bold text-sm">₿</span>
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-bitcoin to-bitcoin-light bg-clip-text text-transparent">
                Bitcoin Center Seoul
              </span>
            </div>
            <p className="text-muted-foreground leading-relaxed mb-6">
              서울 최초의 비트코인 전용 복합문화공간으로, 비트코인의 가치와 기술을 체험하고 배울 수 있는 새로운 문화공간입니다.
            </p>
            <p className="text-sm text-muted-foreground">
              Seoul's first Bitcoin-dedicated cultural complex where you can experience and learn about Bitcoin's value and technology.
            </p>
          </div>

          {/* Contact Info */}
          <div>
            <h3 className="text-lg font-semibold text-foreground mb-4">연락처</h3>
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <MapPin className="w-4 h-4 text-bitcoin mt-1 flex-shrink-0" />
                <span className="text-sm text-muted-foreground">
                  서울시 마포구 신촌로2안길 30 2층
                </span>
              </li>
              <li className="flex items-start gap-3">
                <Clock className="w-4 h-4 text-bitcoin mt-1 flex-shrink-0" />
                <span className="text-sm text-muted-foreground">
                  10:00 - 18:00 (화-일)
                </span>
              </li>
              <li className="flex items-start gap-3">
                <Mail className="w-4 h-4 text-bitcoin mt-1 flex-shrink-0" />
                <span className="text-sm text-muted-foreground">
                  bitcoincenter.seoul@gmail.com
                </span>
              </li>
              <li className="flex items-start gap-3">
                <MessageCircle className="w-4 h-4 text-bitcoin mt-1 flex-shrink-0" />
                <span className="text-sm text-muted-foreground">
                  카카오톡: @bitcoinseoul
                </span>
              </li>
            </ul>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-lg font-semibold text-foreground mb-4">서비스</h3>
            <ul className="space-y-2">
              {['전시', '체험', '교육', '공간 대관', '라운지', '갤러리', '판매', '코워킹'].map((service) => (
                <li key={service}>
                  <span className="text-sm text-muted-foreground hover:text-bitcoin transition-colors cursor-pointer">
                    {service}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="border-t border-border mt-12 pt-8 text-center">
          <p className="text-sm text-muted-foreground">
            © 2024 Bitcoin Center Seoul. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;