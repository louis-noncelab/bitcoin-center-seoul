import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Calendar, Clock, MapPin, Plus, Trash2, Edit, ArrowLeft, Save, X, Eye } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import DatePicker from '@/components/DatePicker';

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

const AdminEvents = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    titleEn: '',
    date: '',
    time: '',
    location: '비트코인 센터 서울',
    locationEn: 'Bitcoin Center Seoul',
    description: '해당 시간동안 비트코인 센터 서울의 이용이 불가능합니다.',
    descriptionEn: 'Bitcoin Center Seoul is unavailable during this time.'
  });

  // 인증 확인
  useEffect(() => {
    const authStatus = sessionStorage.getItem('admin_authenticated');
    console.log('인증 상태 확인:', authStatus); // 디버깅용
    if (authStatus !== 'true') {
      console.log('인증되지 않음, 리다이렉트'); // 디버깅용
      navigate('/admin/auth');
      return;
    }
    console.log('인증됨'); // 디버깅용
    setIsAuthenticated(true);
  }, [navigate]);

  // 이벤트 목록 가져오기
  const fetchEvents = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/events');
      if (response.ok) {
        const data = await response.json();
        setEvents(data);
      } else {
        toast({
          title: "오류",
          description: "이벤트를 불러오는데 실패했습니다.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "오류",
        description: "이벤트를 불러오는데 실패했습니다.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchEvents();
    }
  }, [isAuthenticated]);

  // 폼 초기화
  const resetForm = () => {
    setFormData({
      title: '',
      titleEn: '',
      date: '',
      time: '',
      location: '비트코인 센터 서울',
      locationEn: 'Bitcoin Center Seoul',
      description: '해당 시간동안 비트코인 센터 서울의 이용이 불가능합니다.',
      descriptionEn: 'Bitcoin Center Seoul is unavailable during this time.'
    });
    setIsEditing(false);
    setEditingEvent(null);
  };

  // 이벤트 생성/수정
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // 필수 필드 검증
    const requiredFields = ['title', 'titleEn', 'date', 'time', 'location', 'locationEn', 'description', 'descriptionEn'];
    const missingFields = requiredFields.filter(field => !formData[field as keyof typeof formData]);
    
    if (missingFields.length > 0) {
      toast({
        title: "입력 오류",
        description: `다음 필드를 입력해주세요: ${missingFields.join(', ')}`,
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    try {
      const url = isEditing ? `/api/events/${editingEvent?.id}` : '/api/events';
      const method = isEditing ? 'PUT' : 'POST';

      console.log('이벤트 저장 요청:', { url, method, formData }); // 디버깅용

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      console.log('응답 상태:', response.status); // 디버깅용

      if (response.ok) {
        const result = await response.json();
        console.log('저장 성공:', result); // 디버깅용
        toast({
          title: "성공",
          description: isEditing ? "이벤트가 수정되었습니다." : "이벤트가 생성되었습니다.",
        });
        resetForm();
        fetchEvents();
      } else {
        const errorData = await response.text();
        console.error('저장 실패:', response.status, errorData); // 디버깅용
        toast({
          title: "오류",
          description: `이벤트 저장에 실패했습니다. (${response.status})`,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('네트워크 오류:', error); // 디버깅용
      toast({
        title: "오류",
        description: "네트워크 오류가 발생했습니다.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // 이벤트 삭제
  const handleDelete = async (id: number) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/events/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast({
          title: "성공",
          description: "이벤트가 삭제되었습니다.",
        });
        fetchEvents();
      } else {
        toast({
          title: "오류",
          description: "이벤트 삭제에 실패했습니다.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "오류",
        description: "이벤트 삭제에 실패했습니다.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // 이벤트 수정 시작
  const handleEdit = (event: Event) => {
    setEditingEvent(event);
    setFormData({
      title: event.title,
      titleEn: event.titleEn,
      date: event.date,
      time: event.time,
      location: event.location,
      locationEn: event.locationEn,
      description: event.description,
      descriptionEn: event.descriptionEn
    });
    setIsEditing(true);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long'
    });
  };

  // 인증되지 않은 경우 로딩 화면 표시
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-bitcoin mx-auto mb-4"></div>
          <p className="text-muted-foreground">인증 확인 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto">
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              onClick={() => navigate('/')}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              홈으로
            </Button>
            <h1 className="text-2xl font-bold">이벤트 관리</h1>
          </div>
          <Button
            onClick={resetForm}
            className="bg-bitcoin hover:bg-bitcoin/90"
          >
            <Plus className="w-4 h-4 mr-2" />
            새 이벤트
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 이벤트 등록/수정 폼 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-bitcoin" />
                {isEditing ? '이벤트 수정' : '새 이벤트 등록'}
              </CardTitle>
              <CardDescription>
                {isEditing ? '이벤트 정보를 수정하세요' : '새로운 이벤트를 등록하세요'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">제목 (한국어)</label>
                    <Input
                      value={formData.title}
                      onChange={(e) => setFormData({...formData, title: e.target.value})}
                      placeholder="이벤트 제목"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">제목 (영어)</label>
                    <Input
                      value={formData.titleEn}
                      onChange={(e) => setFormData({...formData, titleEn: e.target.value})}
                      placeholder="Event Title"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">날짜</label>
                    <DatePicker
                      value={formData.date}
                      onChange={(date) => setFormData({...formData, date})}
                      placeholder="날짜를 선택하세요"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">시간</label>
                    <Input
                      value={formData.time}
                      onChange={(e) => setFormData({...formData, time: e.target.value})}
                      placeholder="예: 16:00 - 20:00"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">장소 (한국어)</label>
                    <Input
                      value={formData.location}
                      onChange={(e) => setFormData({...formData, location: e.target.value})}
                      placeholder="이벤트 장소"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">장소 (영어)</label>
                    <Input
                      value={formData.locationEn}
                      onChange={(e) => setFormData({...formData, locationEn: e.target.value})}
                      placeholder="Event Location"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">설명 (한국어)</label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    placeholder="이벤트 설명"
                    rows={3}
                    required
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">설명 (영어)</label>
                  <Textarea
                    value={formData.descriptionEn}
                    onChange={(e) => setFormData({...formData, descriptionEn: e.target.value})}
                    placeholder="Event Description"
                    rows={3}
                    required
                  />
                </div>

                <div className="flex gap-2">
                  {isEditing && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={resetForm}
                      className="flex-1"
                    >
                      <X className="w-4 h-4 mr-2" />
                      취소
                    </Button>
                  )}
                  <Button
                    type="submit"
                    disabled={loading}
                    className="flex-1 bg-bitcoin hover:bg-bitcoin/90"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {loading ? '저장 중...' : (isEditing ? '수정' : '등록')}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* 이벤트 목록 */}
          <Card>
            <CardHeader>
              <CardTitle>등록된 이벤트</CardTitle>
              <CardDescription>
                총 {events.length}개의 이벤트가 등록되어 있습니다
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-bitcoin mx-auto mb-4"></div>
                  <p className="text-muted-foreground">로딩 중...</p>
                </div>
              ) : events.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>등록된 이벤트가 없습니다.</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {events.map((event) => (
                    <div
                      key={event.id}
                      className={`border rounded-lg p-4 transition-all duration-200 ${
                        editingEvent?.id === event.id 
                          ? 'border-bitcoin bg-bitcoin/5' 
                          : 'border-border hover:border-bitcoin/50 hover:bg-card/50'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h4 className="font-semibold text-foreground mb-1">
                            {event.title}
                          </h4>
                          <p className="text-sm text-muted-foreground">
                            {event.titleEn}
                          </p>
                        </div>
                        <div className="flex gap-2 ml-4">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEdit(event)}
                            className="h-8 px-3"
                            title="수정"
                          >
                            <Edit className="w-3 h-3 mr-1" />
                            수정
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 px-3 text-red-500 hover:text-red-700 hover:bg-red-50"
                                title="삭제"
                              >
                                <Trash2 className="w-3 h-3 mr-1" />
                                삭제
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>이벤트 삭제 확인</AlertDialogTitle>
                                <AlertDialogDescription>
                                  <strong>"{event.title}"</strong> 이벤트를 정말로 삭제하시겠습니까?
                                  <br />
                                  <span className="text-red-500">이 작업은 되돌릴 수 없습니다.</span>
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>취소</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDelete(event.id)}
                                  className="bg-red-500 hover:bg-red-600"
                                >
                                  삭제
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Calendar className="w-4 h-4 text-bitcoin flex-shrink-0" />
                          <span className="truncate">{formatDate(event.date)}</span>
                        </div>
                        
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Clock className="w-4 h-4 text-bitcoin flex-shrink-0" />
                          <span>{event.time}</span>
                        </div>
                        
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <MapPin className="w-4 h-4 text-bitcoin flex-shrink-0" />
                          <span className="truncate">{event.location}</span>
                        </div>
                      </div>
                      
                      <div className="mt-3 pt-3 border-t border-border/50">
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {event.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AdminEvents;
