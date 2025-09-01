import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { CalendarDays, Clock, Users, MessageSquare } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

const BookingSection = () => {
  const { language } = useLanguage();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [selectedService, setSelectedService] = useState<string>('');

  const content = {
    ko: {
      title: '대관 예약',
      subtitle: '원하는 서비스와 날짜를 선택하여 예약을 진행하세요.',
      calendar: '예약 캘린더',
      bookingInfo: '예약 정보',
      services: [
        { value: 'admission', label: '입장료 (3,000 sats / 5,000 KRW)' },
        { value: 'event', label: '행사 대관 (200,000 sats / 300,000 KRW per hour)' },
        { value: 'coworking', label: '코워킹 스페이스 (300,000 sats / 500,000 KRW per month)' },
        { value: 'consultation', label: '상담 (100,000 sats / 200,000 KRW per hour)' }
      ],
      operationGuide: '운영 안내',
      operationDetails: '• 화요일 - 일요일 운영 (월요일 휴무)\n• 운영시간: 10:00 - 18:00\n• 예약은 최소 1일 전에 해주세요',
      serviceSelect: '서비스 선택',
      servicePlaceholder: '이용하실 서비스를 선택해주세요',
      time: '시간',
      timePlaceholder: '시간 선택',
      duration: '이용 시간',
      durationPlaceholder: '시간',
      durationOptions: ['1시간', '2시간', '3시간', '4시간 이상'],
      name: '이름',
      namePlaceholder: '홍길동',
      phone: '연락처',
      phonePlaceholder: '010-1234-5678',
      email: '이메일',
      emailPlaceholder: 'bitcoin@example.com',
      message: '추가 요청사항',
      messagePlaceholder: '특별한 요청사항이나 문의사항을 적어주세요...',
      saveButton: '임시저장',
      bookButton: '예약 신청',
      paymentGuide: '결제 안내: 비트코인(Lightning Network) 또는 원화 결제가 가능합니다. 예약 확정 후 결제 안내를 드립니다.'
    },
    en: {
      title: 'Booking',
      subtitle: 'Select your desired service and date to proceed with booking.',
      calendar: 'Booking Calendar',
      bookingInfo: 'Booking Information',
      services: [
        { value: 'admission', label: 'Admission (3,000 sats / 5,000 KRW)' },
        { value: 'event', label: 'Event Rental (200,000 sats / 300,000 KRW per hour)' },
        { value: 'coworking', label: 'Coworking Space (300,000 sats / 500,000 KRW per month)' },
        { value: 'consultation', label: 'Consultation (100,000 sats / 200,000 KRW per hour)' }
      ],
      operationGuide: 'Operation Guide',
      operationDetails: '• Open Tuesday - Sunday (Closed on Mondays)\n• Operating Hours: 10:00 - 18:00\n• Please book at least 1 day in advance',
      serviceSelect: 'Select Service',
      servicePlaceholder: 'Please select the service you want to use',
      time: 'Time',
      timePlaceholder: 'Select time',
      duration: 'Duration',
      durationPlaceholder: 'Hours',
      durationOptions: ['1 hour', '2 hours', '3 hours', '4+ hours'],
      name: 'Name',
      namePlaceholder: 'John Doe',
      phone: 'Phone',
      phonePlaceholder: '010-1234-5678',
      email: 'Email',
      emailPlaceholder: 'bitcoin@example.com',
      message: 'Additional Requests',
      messagePlaceholder: 'Please write any special requests or inquiries...',
      saveButton: 'Save Draft',
      bookButton: 'Submit Booking',
      paymentGuide: 'Payment Guide: Bitcoin (Lightning Network) or KRW payment is available. Payment instructions will be provided after booking confirmation.'
    }
  };

  const timeSlots = [
    '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00'
  ];

  return (
    <section id="booking" className="py-20 bg-background">
      <div className="container mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-foreground to-bitcoin bg-clip-text text-transparent">
            {content[language].title}
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            {content[language].subtitle}
          </p>
        </div>

        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12">
            {/* Calendar Section */}
            <Card className="bg-card border-border shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-foreground">
                  <CalendarDays className="w-6 h-6 text-bitcoin" />
                  {content[language].calendar}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  className="rounded-md border border-border"
                  disabled={(date) => date < new Date() || date.getDay() === 1} // Disable past dates and Mondays
                />
                <div className="mt-6 p-4 bg-muted/50 rounded-lg">
                  <h4 className="font-semibold text-foreground mb-2">{content[language].operationGuide}</h4>
                  <p className="text-sm text-muted-foreground whitespace-pre-line">
                    {content[language].operationDetails}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Booking Form */}
            <Card className="bg-card border-border shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-foreground">
                  <MessageSquare className="w-6 h-6 text-bitcoin" />
                  {content[language].bookingInfo}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="service">{content[language].serviceSelect}</Label>
                  <Select value={selectedService} onValueChange={setSelectedService}>
                    <SelectTrigger>
                      <SelectValue placeholder={content[language].servicePlaceholder} />
                    </SelectTrigger>
                    <SelectContent>
                      {content[language].services.map((service) => (
                        <SelectItem key={service.value} value={service.value}>
                          {service.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="time">{content[language].time}</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder={content[language].timePlaceholder} />
                      </SelectTrigger>
                      <SelectContent>
                        {timeSlots.map((time) => (
                          <SelectItem key={time} value={time}>
                            {time}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="duration">{content[language].duration}</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder={content[language].durationPlaceholder} />
                      </SelectTrigger>
                      <SelectContent>
                        {content[language].durationOptions.map((option, index) => (
                          <SelectItem key={index} value={String(index + 1)}>
                            {option}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">{content[language].name}</Label>
                    <Input id="name" placeholder={content[language].namePlaceholder} />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">{content[language].phone}</Label>
                    <Input id="phone" placeholder={content[language].phonePlaceholder} />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">{content[language].email}</Label>
                  <Input id="email" type="email" placeholder={content[language].emailPlaceholder} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="message">{content[language].message}</Label>
                  <Textarea 
                    id="message" 
                    placeholder={content[language].messagePlaceholder}
                    className="min-h-[100px]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Button 
                    variant="outline"
                    className="border-bitcoin text-bitcoin hover:bg-bitcoin hover:text-bitcoin-foreground"
                  >
                    {content[language].saveButton}
                  </Button>
                  <Button 
                    className="bg-gradient-to-r from-bitcoin to-bitcoin-dark hover:from-bitcoin-dark hover:to-bitcoin text-bitcoin-foreground"
                  >
                    {content[language].bookButton}
                  </Button>
                </div>

                <div className="p-4 bg-bitcoin/10 rounded-lg border border-bitcoin/20">
                  <p className="text-sm text-muted-foreground">
                    <strong className="text-bitcoin">{language === 'ko' ? '결제 안내:' : 'Payment Guide:'}</strong> {content[language].paymentGuide}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
};

export default BookingSection;