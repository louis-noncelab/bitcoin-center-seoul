import { Card, CardContent } from '@/components/ui/card';
import { useLanguage } from '@/contexts/LanguageContext';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { ChevronRight } from 'lucide-react';
import EducationCoursesModal from './EducationCoursesModal';
import MeetupsModal from './MeetupsModal';

const ServicesSection = () => {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const [isEducationModalOpen, setIsEducationModalOpen] = useState(false);
  const [isMeetupsModalOpen, setIsMeetupsModalOpen] = useState(false);

  const content = {
    ko: {
      title: '활동',
      subtitle: '다양한 비트코인 관련 경험을 한 곳에서 만나보세요.',
      services: [
        {
          title: '전시',
          description: '비트코인 관련 굿즈 및 관련 용품',
          image: '/images/What we do/전시.jpeg',
          details: '다양한 비트코인 굿즈와 하드웨어 전시'
        },
        {
          title: '체험',
          description: '하드월렛 등 비트코인 관련 기기 체험',
          image: '/images/What we do/체험.jpeg',
          details: '하드웨어 월렛과 비트코인 기기 직접 체험'
        },
        {
          title: '교육',
          description: '비트코인 관련 교육',
          image: '/images/What we do/교육.png',
          details: '비트코인 기초부터 고급까지 체계적 교육'
        },
        {
          title: '커뮤니티',
          description: '각종 커뮤니티 활동',
          image: '/images/What we do/커뮤니티.jpg',
          details: '비트코인 관련 밋업과 이벤트 개최'
        },
        {
          title: '라운지',
          description: '카페 라운지',
          image: '/images/What we do/라운지.jpeg',
          details: '편안한 카페 라운지에서 네트워킹과 휴식'
        },
        {
          title: '갤러리',
          description: '비트코인 관련 예술작품 전시',
          image: '/images/What we do/갤러리.jpeg',
          details: '비트코인에서 영감을 받은 예술작품 전시'
        },
        {
          title: '판매',
          description: '각종 비트코인 관련 용품 판매',
          image: '/images/What we do/판매.jpeg',
          details: '비트코인 관련 제품과 굿즈 판매 공간'
        },
        {
          title: '코워킹',
          description: '코워킹 스페이스 제공',
          image: '/images/What we do/코워킹.png',
          details: '비트코인 기업가를 위한 전문 코워킹 공간'
        }
      ]
    },
    en: {
      title: 'Activities',
      subtitle: 'Discover a wide range of Bitcoin experiences in one place.',
      services: [
        {
          title: 'Exhibition',
          description: 'Bitcoin merchandise and related equipment',
          image: '/images/What we do/전시.jpeg',
          details: 'Exhibition of various Bitcoin goods and hardware'
        },
        {
          title: 'Experience',
          description: 'Hands-on experience with hardware wallets and Bitcoin devices',
          image: '/images/What we do/체험.jpeg',
          details: 'Direct experience with hardware wallets and Bitcoin devices'
        },
        {
          title: 'Education',
          description: 'Comprehensive Bitcoin education and workshops',
          image: '/images/What we do/교육.png',
          details: 'Systematic education from Bitcoin basics to advanced'
        },
        {
          title: 'Community',
          description: 'Various community activities',
          image: '/images/What we do/커뮤니티.jpg',
          details: 'Bitcoin community meetups and events'
        },
        {
          title: 'Lounge',
          description: 'Comfortable cafe lounge for networking and relaxation',
          image: '/images/What we do/라운지.jpeg',
          details: 'Comfortable cafe lounge for networking and relaxation'
        },
        {
          title: 'Gallery',
          description: 'Gallery showcasing Bitcoin-inspired artwork',
          image: '/images/What we do/갤러리.jpeg',
          details: 'Gallery showcasing Bitcoin-inspired artwork'
        },
        {
          title: 'Retail',
          description: 'Retail space for Bitcoin-related products and merchandise',
          image: '/images/What we do/판매.jpeg',
          details: 'Retail space for Bitcoin-related products and goods'
        },
        {
          title: 'Coworking',
          description: 'Professional coworking space for Bitcoin entrepreneurs',
          image: '/images/What we do/코워킹.png',
          details: 'Professional coworking space for Bitcoin entrepreneurs'
        }
      ]
    }
  };

  const handleServiceClick = (title: string) => {
    if (title === '체험' || title === 'Experience') {
      navigate('/walletExperence');
      return;
    }

    if (title === '교육' || title === 'Education') {
      setIsEducationModalOpen(true);
      return;
    }

    if (title === '커뮤니티' || title === 'Community') {
      setIsMeetupsModalOpen(true);
    }
  };

  const hasAction = (title: string) => {
    return ['체험', 'Experience', '교육', 'Education', '커뮤니티', 'Community'].includes(title);
  };

  return (
    <section id="services" className="py-20 bg-background">
      <div className="container mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-foreground to-bitcoin bg-clip-text text-transparent">
            {content[language].title}
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            {content[language].subtitle}
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {content[language].services.map((service, index) => (
            <Card 
              key={index}
              onClick={() => handleServiceClick(service.title)}
              className="group overflow-hidden bg-card border-border shadow-lg hover:shadow-xl transition-all duration-300 hover:border-bitcoin/50 cursor-pointer"
            >
              <CardContent className="p-0">
                <div className="relative aspect-[4/3] overflow-hidden bg-muted">
                  <img
                    src={service.image}
                    alt={service.title}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-background/95 via-background/35 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 p-4 pr-12">
                    <h3 className="mb-1 text-lg font-semibold text-foreground">
                      {service.title}
                    </h3>
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      {service.description}
                    </p>
                  </div>
                  {hasAction(service.title) && (
                    <div className="absolute bottom-4 right-4 text-muted-foreground/80 drop-shadow-md transition-all duration-300 group-hover:translate-x-1 group-hover:text-foreground">
                      <ChevronRight className="h-6 w-6" />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        <EducationCoursesModal
          open={isEducationModalOpen}
          onOpenChange={setIsEducationModalOpen}
        />
        <MeetupsModal
          open={isMeetupsModalOpen}
          onOpenChange={setIsMeetupsModalOpen}
        />
      </div>
    </section>
  );
};

export default ServicesSection;
