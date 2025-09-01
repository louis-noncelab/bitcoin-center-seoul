import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Check, Coffee, Users, Wifi, Monitor, HelpCircle } from 'lucide-react';

const PricingSection = () => {
  const pricingPlans = [
    {
      title: '입장료',
      titleEn: 'Admission',
      price: '3,000 sats',
      priceKrw: '5,000 KRW',
      icon: Coffee,
      features: [
        'Free Coffee (각종 음료 포함)',
        'Up to 3 Hour',
        '모든 전시 및 체험 이용 가능',
        '라운지 및 갤러리 자유 이용'
      ],
      isPopular: false
    },
    {
      title: '행사 대관',
      titleEn: 'Event Rental',
      price: '200,000 sats',
      priceKrw: '300,000 KRW / Hour',
      icon: Users,
      features: [
        'Wifi',
        'Up to 25 person',
        'Free Coffee',
        'Projector and Screen',
        '전용 행사 공간',
        '음향 시설 제공'
      ],
      isPopular: true
    },
    {
      title: '코워킹 스페이스',
      titleEn: 'Coworking Space',
      price: '300,000 sats',
      priceKrw: '500,000 KRW / month',
      icon: Monitor,
      features: [
        '1 Desk / Chair',
        'Free Coffee',
        'Private Partition',
        '24/7 Access',
        '회의실 이용 가능',
        '네트워킹 이벤트 참여'
      ],
      isPopular: false
    },
    {
      title: '상담',
      titleEn: 'Consultation',
      price: '100,000 sats',
      priceKrw: '200,000 KRW / Hour',
      icon: HelpCircle,
      features: [
        '셀프커스터디 상담',
        '비트코인 관련 상담',
        '1:1 전문 상담',
        '하드웨어 월렛 설정',
        '보안 가이드 제공',
        '투자 전략 조언'
      ],
      isPopular: false
    }
  ];

  return (
    <section id="pricing" className="py-20 bg-card">
      <div className="container mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-foreground to-bitcoin bg-clip-text text-transparent">
            가격 정보
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            다양한 요금제로 비트코인 센터 서울을 자유롭게 이용하세요.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {pricingPlans.map((plan, index) => (
            <Card 
              key={index}
              className={`relative bg-background border-border shadow-lg hover:shadow-xl transition-all duration-300 ${
                plan.isPopular ? 'border-bitcoin ring-2 ring-bitcoin/20' : 'hover:border-bitcoin/50'
              }`}
            >
              {plan.isPopular && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <span className="bg-gradient-to-r from-bitcoin to-bitcoin-dark text-bitcoin-foreground text-xs font-semibold px-3 py-1 rounded-full">
                    인기
                  </span>
                </div>
              )}
              
              <CardHeader className="text-center pb-4">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${
                  plan.isPopular 
                    ? 'bg-gradient-to-r from-bitcoin to-bitcoin-dark' 
                    : 'bg-gradient-to-r from-bitcoin/20 to-bitcoin-dark/20'
                }`}>
                  <plan.icon className={`w-8 h-8 ${
                    plan.isPopular ? 'text-bitcoin-foreground' : 'text-bitcoin'
                  }`} />
                </div>
                <CardTitle className="text-xl font-bold text-foreground">{plan.title}</CardTitle>
                <p className="text-sm text-muted-foreground">{plan.titleEn}</p>
                <div className="mt-4">
                  <div className="text-2xl font-bold text-bitcoin">{plan.price}</div>
                  <div className="text-lg text-muted-foreground">{plan.priceKrw}</div>
                </div>
              </CardHeader>
              
              <CardContent className="pt-0">
                <ul className="space-y-3 mb-6">
                  {plan.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-start gap-3">
                      <Check className="w-4 h-4 text-bitcoin mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-muted-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>
                
                <Button 
                  className={`w-full ${
                    plan.isPopular
                      ? 'bg-gradient-to-r from-bitcoin to-bitcoin-dark hover:from-bitcoin-dark hover:to-bitcoin text-bitcoin-foreground'
                      : 'border-bitcoin text-bitcoin hover:bg-bitcoin hover:text-bitcoin-foreground'
                  }`}
                  variant={plan.isPopular ? 'default' : 'outline'}
                  onClick={() => document.getElementById('booking')?.scrollIntoView({ behavior: 'smooth' })}
                >
                  {plan.title === '상담' ? '상담 신청' : '예약하기'}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default PricingSection;