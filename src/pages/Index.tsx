import { useEffect } from 'react';
import Navigation from '@/components/Navigation';
import HeroSection from '@/components/HeroSection';
import ServicesSection from '@/components/ServicesSection';
import ActivitiesSection from '@/components/ActivitiesSection';
import EventHighlightsSection from '@/components/EventHighlightsSection';
import CommunitySection from '@/components/CommunitySection';
import Footer from '@/components/Footer';
import FloatingContactButton from '@/components/FloatingContactButton';

const Index = () => {
  useEffect(() => {
    if (!window.location.hash) return;

    const sectionId = window.location.hash.slice(1);
    const timer = window.setTimeout(() => {
      const element = document.getElementById(sectionId);
      if (!element) return;

      window.scrollTo({
        top: element.offsetTop - 100,
        behavior: 'smooth',
      });
    }, 100);

    return () => window.clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <HeroSection />
      <ActivitiesSection />
      <EventHighlightsSection />
      <ServicesSection />
      <CommunitySection />
      <Footer />
      <FloatingContactButton />
    </div>
  );
};

export default Index;
