import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, MapPin, X } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

interface Event {
  id: number;
  title: string;
  titleEn: string;
  date: string;
  time: string;
  location: string;
  locationEn: string;
  description: string;
  descriptionEn: string;
}

const EventScheduleModal = () => {
  const { language } = useLanguage();
  const [isOpen, setIsOpen] = React.useState(false);
  const [events, setEvents] = React.useState<Event[]>([]);
  const [loading, setLoading] = React.useState(false);

  // API에서 이벤트 데이터 가져오기
  const fetchEvents = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/events/upcoming');
      if (response.ok) {
        const data = await response.json();
        setEvents(data);
      } else {
        console.error('이벤트 데이터를 가져오는데 실패했습니다.');
      }
    } catch (error) {
      console.error('이벤트 데이터 요청 오류:', error);
    } finally {
      setLoading(false);
    }
  };

  // 모달이 열릴 때 이벤트 데이터 가져오기
  React.useEffect(() => {
    if (isOpen) {
      fetchEvents();
    }
  }, [isOpen]);

  const content = {
    ko: {
      title: '이벤트 일정',
      upcomingEvents: '다가오는 이벤트',
      noEvents: '현재 예정된 이벤트가 없습니다.',
      close: '닫기'
    },
    en: {
      title: 'Event Schedule',
      upcomingEvents: 'Upcoming Events',
      noEvents: 'No upcoming events scheduled.',
      close: 'Close'
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(language === 'ko' ? 'ko-KR' : 'en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long'
    });
  };

  // API에서 이미 필터링된 데이터를 받아오므로 추가 필터링 불필요

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="border-bitcoin text-bitcoin hover:bg-bitcoin hover:text-foreground"
        >
          <Calendar className="w-4 h-4 mr-2" />
          {language === 'ko' ? '이벤트 일정' : 'Events'}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-bitcoin" />
              {content[language].title}
            </div>
            <a 
              href="/admin/events" 
              className="text-xs text-muted-foreground hover:text-bitcoin transition-colors"
            >
              일정관리
            </a>
          </DialogTitle>
        </DialogHeader>
        
        <div className="mt-6">
          <h3 className="text-lg font-semibold mb-4 text-foreground">
            {content[language].upcomingEvents}
          </h3>
          
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-bitcoin mx-auto mb-4"></div>
              <p>이벤트를 불러오는 중...</p>
            </div>
          ) : events.length > 0 ? (
            <div className="space-y-4">
              {events.map((event) => (
                <div
                  key={event.id}
                  className="border border-border rounded-lg p-4 hover:bg-card/50 transition-colors"
                >
                  <div className="flex items-start justify-between mb-3">
                    <h4 className="text-lg font-semibold text-foreground">
                      {language === 'ko' ? event.title : event.titleEn}
                    </h4>
                  </div>
                  
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-bitcoin" />
                      <span>{formatDate(event.date)}</span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-bitcoin" />
                      <span>{event.time}</span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-bitcoin" />
                      <span>{language === 'ko' ? event.location : event.locationEn}</span>
                    </div>
                  </div>
                  
                  <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
                    {language === 'ko' ? event.description : event.descriptionEn}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>{content[language].noEvents}</p>
            </div>
          )}
        </div>
        
        <div className="flex justify-end mt-6 pt-4 border-t border-border">
          <Button
            variant="outline"
            onClick={() => setIsOpen(false)}
            className="border-bitcoin text-bitcoin hover:bg-bitcoin hover:text-foreground"
          >
            {content[language].close}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EventScheduleModal;
