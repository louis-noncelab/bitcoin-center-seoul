import { Card, CardContent } from '@/components/ui/card';
import { MapPin, Clock, Phone } from 'lucide-react';

const AboutSection = () => {
  return (
    <section id="about" className="py-20 bg-card">
      <div className="container mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-foreground to-bitcoin bg-clip-text text-transparent">
            소개
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            비트코인의 가치와 기술을 체험하고 배울 수 있는 서울의 새로운 문화공간입니다.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          <Card className="bg-background border-border shadow-lg hover:shadow-xl transition-all duration-300">
            <CardContent className="p-8 text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-bitcoin to-bitcoin-dark rounded-full flex items-center justify-center mx-auto mb-6">
                <MapPin className="w-8 h-8 text-bitcoin-foreground" />
              </div>
              <h3 className="text-xl font-semibold mb-4 text-foreground">위치</h3>
              <p className="text-muted-foreground leading-relaxed">
                서울시 마포구 신촌로2안길 30 2층
                <br />
                <span className="text-sm">지하철 6호선 상수역 도보 5분</span>
              </p>
            </CardContent>
          </Card>

          <Card className="bg-background border-border shadow-lg hover:shadow-xl transition-all duration-300">
            <CardContent className="p-8 text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-bitcoin to-bitcoin-dark rounded-full flex items-center justify-center mx-auto mb-6">
                <Clock className="w-8 h-8 text-bitcoin-foreground" />
              </div>
              <h3 className="text-xl font-semibold mb-4 text-foreground">운영시간</h3>
              <p className="text-muted-foreground leading-relaxed">
                10:00 - 18:00
                <br />
                화요일 - 일요일
                <br />
                <span className="text-sm">(월요일 휴무)</span>
              </p>
            </CardContent>
          </Card>

          <Card className="bg-background border-border shadow-lg hover:shadow-xl transition-all duration-300">
            <CardContent className="p-8 text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-bitcoin to-bitcoin-dark rounded-full flex items-center justify-center mx-auto mb-6">
                <Phone className="w-8 h-8 text-bitcoin-foreground" />
              </div>
              <h3 className="text-xl font-semibold mb-4 text-foreground">문의</h3>
              <p className="text-muted-foreground leading-relaxed">
                예약 및 문의
                <br />
                bitcoincenter.seoul@gmail.com
                <br />
                <span className="text-sm">카카오톡: @bitcoinseoul</span>
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
};

export default AboutSection;