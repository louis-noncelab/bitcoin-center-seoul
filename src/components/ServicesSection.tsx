import { Card, CardContent } from '@/components/ui/card';
import { Monitor, Gamepad2, GraduationCap, Users, Coffee, Palette, ShoppingBag, Laptop } from 'lucide-react';

const ServicesSection = () => {
  const services = [
    {
      icon: Monitor,
      title: '전시',
      description: '비트코인 관련 굿즈 및 관련 용품',
      details: 'Bitcoin merchandise and related equipment exhibition'
    },
    {
      icon: Gamepad2,
      title: '체험',
      description: '하드월렛 등 비트코인 관련 기기 체험',
      details: 'Hands-on experience with hardware wallets and Bitcoin devices'
    },
    {
      icon: GraduationCap,
      title: '교육',
      description: '비트코인 관련 교육',
      details: 'Comprehensive Bitcoin education and workshops'
    },
    {
      icon: Users,
      title: '공간',
      description: '밋업 등 비트코인 커뮤니티를 위한 공간 제공',
      details: 'Community space for meetups and Bitcoin gatherings'
    },
    {
      icon: Coffee,
      title: '라운지',
      description: '카페 라운지',
      details: 'Comfortable cafe lounge for networking and relaxation'
    },
    {
      icon: Palette,
      title: '갤러리',
      description: '비트코인 관련 예술작품 전시',
      details: 'Gallery showcasing Bitcoin-inspired artwork'
    },
    {
      icon: ShoppingBag,
      title: '판매',
      description: '각종 비트코인 관련 용품 판매',
      details: 'Retail space for Bitcoin-related products and merchandise'
    },
    {
      icon: Laptop,
      title: '코워킹',
      description: '코워킹 스페이스 제공',
      details: 'Professional coworking space for Bitcoin entrepreneurs'
    }
  ];

  return (
    <section id="services" className="py-20 bg-background">
      <div className="container mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-foreground to-bitcoin bg-clip-text text-transparent">
            주요 역할
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            다양한 비트코인 관련 서비스와 체험을 한 곳에서 만나보세요.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {services.map((service, index) => (
            <Card 
              key={index}
              className="bg-card border-border shadow-lg hover:shadow-xl transition-all duration-300 hover:border-bitcoin/50 group"
            >
              <CardContent className="p-6 text-center">
                <div className="w-14 h-14 bg-gradient-to-r from-bitcoin/20 to-bitcoin-dark/20 rounded-lg flex items-center justify-center mx-auto mb-4 group-hover:from-bitcoin group-hover:to-bitcoin-dark transition-all duration-300">
                  <service.icon className="w-7 h-7 text-bitcoin group-hover:text-bitcoin-foreground transition-colors duration-300" />
                </div>
                <h3 className="text-lg font-semibold mb-2 text-foreground">{service.title}</h3>
                <p className="text-muted-foreground text-sm mb-2 leading-relaxed">
                  {service.description}
                </p>
                <p className="text-xs text-muted-foreground/80 leading-relaxed">
                  {service.details}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ServicesSection;