import { Card, CardContent } from '@/components/ui/card';
import { MapPin, Clock, Phone } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

const AboutSection = () => {
  const { language } = useLanguage();

  const content = {
    ko: {
      title: '소개',
      subtitle: '비트코인의 가치와 기술을 체험하고 배울 수 있는 서울의 새로운 문화공간입니다.',
      location: '위치',
      locationAddress: '서울시 마포구 신촌로2안길 30 2층',
      locationSubtext: '지하철 6호선 상수역 도보 5분',
      hours: '운영시간',
      hoursDetail: '10:00 - 18:00\n화요일 - 일요일\n(월요일 휴무)',
      contact: '문의',
      contactDetail: '예약 및 문의\nbitcoincenter.seoul@gmail.com\n카카오톡: @bitcoinseoul'
    },
    en: {
      title: 'About',
      subtitle: 'A new cultural space in Seoul where you can experience and learn about the value and technology of Bitcoin.',
      location: 'Location',
      locationAddress: '30, Sinchon-ro 2an-gil, Mapo-gu, Seoul, 2nd Floor',
      locationSubtext: '5 min walk from Sangsu Station (Line 6)',
      hours: 'Business Hours',
      hoursDetail: '10:00 - 18:00\nTuesday - Sunday\n(Closed on Mondays)',
      contact: 'Contact',
      contactDetail: 'Reservations & Inquiries\nbitcoincenter.seoul@gmail.com\nKakaoTalk: @bitcoinseoul'
    }
  };
  return (
    <section id="about" className="py-20 bg-card">
      <div className="container mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-foreground to-bitcoin bg-clip-text text-transparent">
            {content[language].title}
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            {content[language].subtitle}
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          <Card className="bg-background border-border shadow-lg hover:shadow-xl transition-all duration-300">
            <CardContent className="p-8 text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-bitcoin to-bitcoin-dark rounded-full flex items-center justify-center mx-auto mb-6">
                <MapPin className="w-8 h-8 text-bitcoin-foreground" />
              </div>
              <h3 className="text-xl font-semibold mb-4 text-foreground">{content[language].location}</h3>
              <p className="text-muted-foreground leading-relaxed">
                {content[language].locationAddress}
                <br />
                <span className="text-sm">{content[language].locationSubtext}</span>
              </p>
            </CardContent>
          </Card>

          <Card className="bg-background border-border shadow-lg hover:shadow-xl transition-all duration-300">
            <CardContent className="p-8 text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-bitcoin to-bitcoin-dark rounded-full flex items-center justify-center mx-auto mb-6">
                <Clock className="w-8 h-8 text-bitcoin-foreground" />
              </div>
              <h3 className="text-xl font-semibold mb-4 text-foreground">{content[language].hours}</h3>
              <p className="text-muted-foreground leading-relaxed whitespace-pre-line">
                {content[language].hoursDetail}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-background border-border shadow-lg hover:shadow-xl transition-all duration-300">
            <CardContent className="p-8 text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-bitcoin to-bitcoin-dark rounded-full flex items-center justify-center mx-auto mb-6">
                <Phone className="w-8 h-8 text-bitcoin-foreground" />
              </div>
              <h3 className="text-xl font-semibold mb-4 text-foreground">{content[language].contact}</h3>
              <p className="text-muted-foreground leading-relaxed whitespace-pre-line">
                {content[language].contactDetail}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
};

export default AboutSection;