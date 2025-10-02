import { Card, CardContent } from '@/components/ui/card';
import { MapPin, Clock, Phone } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

const AboutSection = () => {
  const { language } = useLanguage();

  const content = {
    ko: {
      title: '소개',
      subtitle: '비트코인의 가치와 기술을 체험하고 배울 수 있는 공간입니다.',
      location: '위치',
      locationAddress: '서울시 마포구 신촌로2안길 30 2층',
      locationSubtext: '지하철 홍대입구역 6번출구 도보 3분',
      hours: '운영시간',
      hoursDetail: '12:00 - 20:00\n연중 무휴\n(법정 공휴일 제외)',
      contact: '문의',
      contactDetail: '예약 및 문의\nhello@noncelab.com\n+82-2-702-1718'
    },
    en: {
      title: 'About',
      subtitle: 'A space in Seoul where you can experience and learn about the value and technology of Bitcoin.',
      location: 'Location',
      locationAddress: '30, Sinchon-ro 2an-gil, Mapo-gu, Seoul, 2F',
      locationSubtext: '3 min walk from Hongik University Station (Exit 6)',
      hours: 'Business Hours',
      hoursDetail: '12:00 - 20:00\nMon-Sun, except holidays',
      contact: 'Contact',
      contactDetail: 'Reservations & Inquiries\nhello@noncelab.com\n+82-2-702-1718'
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
              
              {/* 지도 링크 버튼들 */}
              <div className="flex flex-col sm:flex-row gap-2 justify-center mt-4">
                <a 
                  href="https://maps.google.com/?q=신촌로2안길+30"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-bitcoin bg-bitcoin/10 border border-bitcoin/20 rounded-lg hover:bg-bitcoin/20 hover:border-bitcoin/30 transition-all duration-200"
                >
                  <MapPin className="w-4 h-4 mr-2" />
                  {language === 'ko' ? '구글 지도' : 'Google Maps'}
                </a>
              </div>
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