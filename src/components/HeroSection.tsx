import { Button } from '@/components/ui/button';
import { MapPin, Clock } from 'lucide-react';

const HeroSection = () => {
  return (
    <section className="min-h-screen bg-gradient-to-br from-background via-background to-card flex items-center justify-center relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,hsl(var(--bitcoin-orange)/0.1)_0%,transparent_50%)]" />
      
      <div className="container mx-auto px-6 py-20 text-center relative z-10">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-foreground via-bitcoin to-bitcoin-light bg-clip-text text-transparent leading-tight">
            Bitcoin Center
            <br />
            Seoul
          </h1>
          
          <p className="text-xl md:text-2xl text-muted-foreground mb-8 leading-relaxed">
            서울 최초의 비트코인 전용 복합문화공간
            <br />
            <span className="text-lg">Seoul's First Bitcoin-Dedicated Cultural Complex</span>
          </p>

          <div className="flex flex-col md:flex-row items-center justify-center gap-8 mb-12">
            <div className="flex items-center gap-3 text-muted-foreground">
              <MapPin className="w-5 h-5 text-bitcoin" />
              <span>서울시 마포구 신촌로2안길 30 2층</span>
            </div>
            <div className="flex items-center gap-3 text-muted-foreground">
              <Clock className="w-5 h-5 text-bitcoin" />
              <span>10:00 - 18:00 (화-일)</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg"
              className="bg-gradient-to-r from-bitcoin to-bitcoin-dark hover:from-bitcoin-dark hover:to-bitcoin text-bitcoin-foreground shadow-lg hover:shadow-xl transition-all duration-300"
              onClick={() => document.getElementById('booking')?.scrollIntoView({ behavior: 'smooth' })}
            >
              예약하기
            </Button>
            <Button 
              variant="outline" 
              size="lg"
              className="border-bitcoin text-bitcoin hover:bg-bitcoin hover:text-bitcoin-foreground"
              onClick={() => document.getElementById('about')?.scrollIntoView({ behavior: 'smooth' })}
            >
              자세히 보기
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;