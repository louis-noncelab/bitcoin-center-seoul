import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { CalendarDays, Clock, Users, MessageSquare } from 'lucide-react';

const BookingSection = () => {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [selectedService, setSelectedService] = useState<string>('');
  
  const services = [
    { value: 'admission', label: '입장료 (3,000 sats / 5,000 KRW)' },
    { value: 'event', label: '행사 대관 (200,000 sats / 300,000 KRW per hour)' },
    { value: 'coworking', label: '코워킹 스페이스 (300,000 sats / 500,000 KRW per month)' },
    { value: 'consultation', label: '상담 (100,000 sats / 200,000 KRW per hour)' }
  ];

  const timeSlots = [
    '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00'
  ];

  return (
    <section id="booking" className="py-20 bg-background">
      <div className="container mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-foreground to-bitcoin bg-clip-text text-transparent">
            대관 예약
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            원하는 서비스와 날짜를 선택하여 예약을 진행하세요.
          </p>
        </div>

        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12">
            {/* Calendar Section */}
            <Card className="bg-card border-border shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-foreground">
                  <CalendarDays className="w-6 h-6 text-bitcoin" />
                  예약 캘린더
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
                  <h4 className="font-semibold text-foreground mb-2">운영 안내</h4>
                  <p className="text-sm text-muted-foreground">
                    • 화요일 - 일요일 운영 (월요일 휴무)
                    <br />
                    • 운영시간: 10:00 - 18:00
                    <br />
                    • 예약은 최소 1일 전에 해주세요
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Booking Form */}
            <Card className="bg-card border-border shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-foreground">
                  <MessageSquare className="w-6 h-6 text-bitcoin" />
                  예약 정보
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="service">서비스 선택</Label>
                  <Select value={selectedService} onValueChange={setSelectedService}>
                    <SelectTrigger>
                      <SelectValue placeholder="이용하실 서비스를 선택해주세요" />
                    </SelectTrigger>
                    <SelectContent>
                      {services.map((service) => (
                        <SelectItem key={service.value} value={service.value}>
                          {service.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="time">시간</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="시간 선택" />
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
                    <Label htmlFor="duration">이용 시간</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="시간" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1시간</SelectItem>
                        <SelectItem value="2">2시간</SelectItem>
                        <SelectItem value="3">3시간</SelectItem>
                        <SelectItem value="4">4시간 이상</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">이름</Label>
                    <Input id="name" placeholder="홍길동" />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">연락처</Label>
                    <Input id="phone" placeholder="010-1234-5678" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">이메일</Label>
                  <Input id="email" type="email" placeholder="bitcoin@example.com" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="message">추가 요청사항</Label>
                  <Textarea 
                    id="message" 
                    placeholder="특별한 요청사항이나 문의사항을 적어주세요..."
                    className="min-h-[100px]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Button 
                    variant="outline"
                    className="border-bitcoin text-bitcoin hover:bg-bitcoin hover:text-bitcoin-foreground"
                  >
                    임시저장
                  </Button>
                  <Button 
                    className="bg-gradient-to-r from-bitcoin to-bitcoin-dark hover:from-bitcoin-dark hover:to-bitcoin text-bitcoin-foreground"
                  >
                    예약 신청
                  </Button>
                </div>

                <div className="p-4 bg-bitcoin/10 rounded-lg border border-bitcoin/20">
                  <p className="text-sm text-muted-foreground">
                    <strong className="text-bitcoin">결제 안내:</strong> 비트코인(Lightning Network) 또는 원화 결제가 가능합니다. 
                    예약 확정 후 결제 안내를 드립니다.
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