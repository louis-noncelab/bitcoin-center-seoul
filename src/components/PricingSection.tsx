import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Check, Coffee, Users } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

const PricingSection = () => {
  const { language } = useLanguage();

  const content = {
    ko: {
      title: '가격 정보',
      subtitle: '비트코인 결제를 통해 비트코인 센터 서울을 이용하세요.',
      popular: '인기',
      pricing: [
        {
          title: '입장료',
          titleEn: 'Admission',
          price: '3,000 sats',
          priceKrw: '원화 결제시 +20%',
          icon: Coffee,
          features: [
            '무료 커피 (각종 음료 포함)',
            '최대 3 시간',
            '모든 전시 및 체험 이용 가능',
            '라운지 및 갤러리 자유 이용'
          ],
          isPopular: false,
          buttonText: '예약하기'
        },
        {
          title: '행사 대관',
          titleEn: 'Event Rental',
          price: '150,000 sat / hour',
          priceKrw: '원화 결제시 +20%',
          icon: Users,
          features: [
            '와이파이',
            '최대 25인',
            '무료 커피',
            '프로젝터와 스크린',
            '전용 행사 공간',
            '음향 시설 제공'
          ],
          isPopular: true,
          buttonText: '문의하기'
        }
      ]
    },
    en: {
      title: 'Price',
      subtitle: 'Use Bitcoin Center Seoul through Bitcoin payments.',
      popular: 'Popular',
      pricing: [
        {
          title: 'Admission',
          titleEn: '입장료',
          price: '3,000 sats',
          priceKrw: '+20% in KRW',
          icon: Coffee,
          features: [
            'Free Coffee (various beverages included)',
            'Up to 3 hours',
            'Access to all exhibitions and experiences',
            'Free access to lounge and gallery'
          ],
          isPopular: false,
          buttonText: 'Book Now'
        },
        {
          title: 'Event Rental',
          titleEn: '행사 대관',
          price: '150,000 sat / hour',
          priceKrw: '+20% in KRW',
          icon: Users,
          features: [
            'Wifi',
            'Up to 25 people',
            'Free Coffee',
            'Projector and Screen',
            'Dedicated event space',
            'Audio equipment provided'
          ],
          isPopular: true,
          buttonText: 'Contact Us'
        }
      ]
    }
  };

  const handleContact = () => {
    const subject = language === 'ko' 
      ? encodeURIComponent('행사 대관 문의')
      : encodeURIComponent('Event Space Inquiry');
    
    const body = language === 'ko'
      ? encodeURIComponent(`안녕하세요,\n\n비트코인 센터 서울 행사 대관에 대해 문의드립니다.\n\n행사 일정:\n행사 내용:\n참석 인원:\n기타 요청사항:\n\n연락처:\n\n감사합니다.`)
      : encodeURIComponent(`Hello,\n\nI would like to inquire about event space rental at Bitcoin Center Seoul.\n\nEvent Date:\nEvent Details:\nNumber of Attendees:\nOther Requirements:\n\nContact Information:\n\nThank you.`);
    
    window.open(`mailto:hello@noncelab.com?subject=${subject}&body=${body}`, '_blank');
  };

  return (
    <section id="pricing" className="py-20 bg-card">
      <div className="container mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-foreground to-bitcoin bg-clip-text text-transparent">
            {content[language].title}
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            {content[language].subtitle}
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {content[language].pricing.map((plan, index) => (
            <Card 
              key={index}
              className={`relative bg-background border-border shadow-lg hover:shadow-xl transition-all duration-300 p-2 ${
                plan.isPopular ? 'border-bitcoin ring-2 ring-bitcoin/20' : 'hover:border-bitcoin/50'
              }`}
            >
              {plan.isPopular && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <span className="bg-gradient-to-r from-bitcoin to-bitcoin-dark text-bitcoin-foreground text-xs font-semibold px-3 py-1 rounded-full">
                    {content[language].popular}
                  </span>
                </div>
              )}
              
              <CardHeader className="text-center pb-6">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${
                  plan.isPopular 
                    ? 'bg-gradient-to-r from-bitcoin to-bitcoin-dark' 
                    : 'bg-gradient-to-r from-bitcoin/20 to-bitcoin-dark/20'
                }`}>
                  <plan.icon className={`w-8 h-8 ${
                    plan.isPopular ? 'text-bitcoin-foreground' : 'text-bitcoin'
                  }`} />
                </div>
                <CardTitle className="text-xl font-bold text-foreground leading-relaxed overflow-visible pb-3">{plan.title}</CardTitle>
                <p className="text-sm text-muted-foreground leading-relaxed overflow-visible pb-3">{plan.titleEn}</p>
                <div className="mt-4">
                  <div className="text-2xl font-bold text-bitcoin leading-relaxed overflow-visible pb-3">{plan.price}</div>
                  <div className="text-lg text-muted-foreground leading-relaxed overflow-visible pb-3">{plan.priceKrw}</div>
                </div>
              </CardHeader>
              
              <CardContent className="pt-0 pb-6">
                <ul className="space-y-3 mb-6">
                  {plan.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-start gap-3">
                      <Check className="w-4 h-4 text-bitcoin mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-muted-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>
                
                {/* 행사 대관에만 문의하기 버튼 표시 */}
                {plan.isPopular && (
                  <Button 
                    className="w-full bg-gradient-to-r from-bitcoin to-bitcoin-dark hover:from-bitcoin-dark hover:to-bitcoin text-bitcoin-foreground"
                    onClick={handleContact}
                  >
                    {language === 'ko' ? '대관 문의하기' : 'Inquire for Rental'}
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default PricingSection;