import React, { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit, ExternalLink, Image, Plus, Save, Trash2, Upload, X } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';

interface Highlight {
  id: number;
  title: string;
  titleEn: string;
  meta: string;
  metaEn: string;
  category: string;
  categoryEn: string;
  date: string;
  host: string;
  hostEn: string;
  description: string;
  descriptionEn: string;
  image: string;
  link: string;
  icon: string;
  sort_order: number;
  is_active: number;
}

const defaultForm = {
  title: '',
  titleEn: '',
  meta: '하이라이트',
  metaEn: 'Highlight',
  category: '행사',
  categoryEn: 'Event',
  date: '',
  host: '비트코인 센터 서울',
  hostEn: 'Bitcoin Center Seoul',
  description: '',
  descriptionEn: '',
  image: '',
  link: '',
  icon: 'calendar',
  sort_order: 0,
  is_active: true,
};

const AdminHighlights = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editingHighlight, setEditingHighlight] = useState<Highlight | null>(null);
  const [formData, setFormData] = useState(defaultForm);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const authStatus = sessionStorage.getItem('admin_authenticated');
    if (authStatus !== 'true') {
      navigate(`/admin/auth?redirect=${encodeURIComponent(location.pathname)}`);
      return;
    }
    setIsAuthenticated(true);
  }, [navigate, location.pathname]);

  const fetchHighlights = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/highlights/all');
      if (response.ok) {
        setHighlights(await response.json());
      } else {
        toast({ title: '오류', description: '하이라이트를 불러오는데 실패했습니다.', variant: 'destructive' });
      }
    } catch {
      toast({ title: '오류', description: '하이라이트를 불러오는데 실패했습니다.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchHighlights();
    }
  }, [isAuthenticated]);

  const resetForm = () => {
    setFormData(defaultForm);
    setIsEditing(false);
    setEditingHighlight(null);
  };

  const handleEdit = (highlight: Highlight) => {
    setEditingHighlight(highlight);
    setFormData({
      title: highlight.title,
      titleEn: highlight.titleEn,
      meta: highlight.meta,
      metaEn: highlight.metaEn,
      category: highlight.category || '행사',
      categoryEn: highlight.categoryEn || 'Event',
      date: highlight.date || '',
      host: highlight.host || '비트코인 센터 서울',
      hostEn: highlight.hostEn || 'Bitcoin Center Seoul',
      description: highlight.description,
      descriptionEn: highlight.descriptionEn,
      image: highlight.image,
      link: highlight.link || '',
      icon: highlight.icon,
      sort_order: highlight.sort_order,
      is_active: Boolean(highlight.is_active),
    });
    setIsEditing(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const requiredFields = ['title', 'titleEn', 'category', 'categoryEn', 'date', 'host', 'hostEn', 'description', 'descriptionEn', 'image'];
    const missingFields = requiredFields.filter((field) => !formData[field as keyof typeof formData]);

    if (missingFields.length > 0) {
      toast({ title: '입력 오류', description: `다음 필드를 입력해주세요: ${missingFields.join(', ')}`, variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      const url = isEditing ? `/api/highlights/${editingHighlight?.id}` : '/api/highlights';
      const method = isEditing ? 'PUT' : 'POST';
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          meta: formData.meta || '하이라이트',
          metaEn: formData.metaEn || 'Highlight',
        }),
      });

      if (response.ok) {
        toast({ title: '성공', description: isEditing ? '하이라이트가 수정되었습니다.' : '하이라이트가 생성되었습니다.' });
        resetForm();
        fetchHighlights();
      } else {
        toast({ title: '오류', description: '하이라이트 저장에 실패했습니다.', variant: 'destructive' });
      }
    } catch {
      toast({ title: '오류', description: '네트워크 오류가 발생했습니다.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/highlights/${id}`, { method: 'DELETE' });
      if (response.ok) {
        toast({ title: '성공', description: '하이라이트가 삭제되었습니다.' });
        fetchHighlights();
      } else {
        toast({ title: '오류', description: '하이라이트 삭제에 실패했습니다.', variant: 'destructive' });
      }
    } catch {
      toast({ title: '오류', description: '하이라이트 삭제에 실패했습니다.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const uploadImage = async (file?: File) => {
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({ title: '업로드 오류', description: '이미지 파일만 업로드할 수 있습니다.', variant: 'destructive' });
      return;
    }

    setIsUploading(true);
    try {
      const response = await fetch('/api/highlight-images', {
        method: 'POST',
        headers: {
          'Content-Type': file.type,
          'X-File-Name': encodeURIComponent(file.name),
        },
        body: file,
      });

      if (response.ok) {
        const data = await response.json();
        setFormData((current) => ({ ...current, image: data.path }));
        toast({ title: '성공', description: '이미지가 업로드되었습니다.' });
      } else {
        const data = await response.json().catch(() => null);
        toast({ title: '업로드 오류', description: data?.error || '이미지 업로드에 실패했습니다.', variant: 'destructive' });
      }
    } catch {
      toast({ title: '업로드 오류', description: '이미지 업로드 중 네트워크 오류가 발생했습니다.', variant: 'destructive' });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

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
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={() => navigate('/')} className="flex items-center gap-2">
              <ArrowLeft className="w-4 h-4" />
              홈으로
            </Button>
            <Button variant="outline" onClick={() => navigate('/admin/events')}>
              대관 일정 관리
            </Button>
            <h1 className="text-2xl font-bold">하이라이트 관리</h1>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[0.9fr_1.1fr] gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Image className="w-5 h-5 text-bitcoin" />
                {isEditing ? '하이라이트 수정' : '새 하이라이트 등록'}
              </CardTitle>
              <CardDescription>홈페이지 하이라이트 카드의 문구와 이미지를 관리합니다.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">제목 (한국어)</label>
                    <Input value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} required />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">제목 (영어)</label>
                    <Input value={formData.titleEn} onChange={(e) => setFormData({ ...formData, titleEn: e.target.value })} required />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">카테고리</label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      <option value="밋업">밋업</option>
                      <option value="강의">강의</option>
                      <option value="행사">행사</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Category (영어)</label>
                    <select
                      value={formData.categoryEn}
                      onChange={(e) => setFormData({ ...formData, categoryEn: e.target.value })}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      <option value="Meetup">Meetup</option>
                      <option value="Class">Class</option>
                      <option value="Event">Event</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">날짜</label>
                    <Input value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} placeholder="2026.04.19" required />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">주최 (한국어)</label>
                    <Input value={formData.host} onChange={(e) => setFormData({ ...formData, host: e.target.value })} required />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Host (영어)</label>
                    <Input value={formData.hostEn} onChange={(e) => setFormData({ ...formData, hostEn: e.target.value })} required />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">설명 (한국어)</label>
                  <Textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={3} required />
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">설명 (영어)</label>
                  <Textarea value={formData.descriptionEn} onChange={(e) => setFormData({ ...formData, descriptionEn: e.target.value })} rows={3} required />
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">링크 첨부</label>
                  <Input
                    type="url"
                    value={formData.link}
                    onChange={(e) => setFormData({ ...formData, link: e.target.value })}
                    placeholder="https://example.com"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">이미지</label>
                  <div
                    onDragEnter={(e) => {
                      e.preventDefault();
                      setIsDragging(true);
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDragging(true);
                    }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setIsDragging(false);
                      uploadImage(e.dataTransfer.files?.[0]);
                    }}
                    className={`mb-3 rounded-lg border border-dashed p-5 text-center transition-colors ${
                      isDragging ? 'border-bitcoin bg-bitcoin/10' : 'border-border bg-muted/20'
                    }`}
                  >
                    <Upload className="mx-auto mb-2 h-6 w-6 text-bitcoin" />
                    <p className="text-sm font-medium text-foreground">
                      이미지를 드래그하거나 파일을 선택하세요
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      JPG, PNG, WEBP, GIF / 최대 20MB
                    </p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => uploadImage(e.target.files?.[0])}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={isUploading}
                      onClick={() => fileInputRef.current?.click()}
                      className="mt-3"
                    >
                      {isUploading ? '업로드 중...' : '컴퓨터에서 선택'}
                    </Button>
                  </div>
                  {formData.image && (
                    <img src={formData.image} alt="선택된 하이라이트" className="mt-3 aspect-video w-full rounded-md object-cover" />
                  )}
                </div>

                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked === true })}
                  />
                  홈페이지에 표시
                </label>

                <div className="flex gap-2">
                  {isEditing && (
                    <Button type="button" variant="outline" onClick={resetForm} className="flex-1">
                      <X className="w-4 h-4 mr-2" />
                      취소
                    </Button>
                  )}
                  <Button type="submit" disabled={loading} className="flex-1 bg-bitcoin hover:bg-bitcoin/90">
                    <Save className="w-4 h-4 mr-2" />
                    {loading ? '저장 중...' : (isEditing ? '수정' : '등록')}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle>등록된 하이라이트</CardTitle>
                  <CardDescription>총 {highlights.length}개의 하이라이트가 등록되어 있습니다.</CardDescription>
                </div>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => {
                    resetForm();
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="bg-bitcoin hover:bg-bitcoin/90"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  새 하이라이트 추가하기
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-bitcoin mx-auto mb-4"></div>
                  <p className="text-muted-foreground">로딩 중...</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[720px] overflow-y-auto">
                  {highlights.map((highlight) => (
                    <div
                      key={highlight.id}
                      className={`grid grid-cols-[120px_1fr] gap-4 rounded-lg border p-3 ${
                        editingHighlight?.id === highlight.id ? 'border-bitcoin bg-bitcoin/5' : 'border-border'
                      }`}
                    >
                      <img src={highlight.image} alt={highlight.title} className="aspect-[4/3] rounded-md object-cover" />
                      <div>
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h4 className="font-semibold text-foreground">{highlight.title}</h4>
                            <p className="text-xs text-bitcoin">{highlight.meta}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {highlight.category || '행사'} · {highlight.date || '날짜 없음'} · {highlight.host || '비트코인 센터 서울'}
                            </p>
                            <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{highlight.description}</p>
                            {highlight.link && (
                              <a
                                href={highlight.link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="mt-2 inline-flex items-center gap-1 text-xs text-bitcoin hover:text-bitcoin-light"
                              >
                                링크 열기
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            )}
                            <p className="text-xs text-muted-foreground mt-2">
                              {highlight.is_active ? '표시 중' : '숨김'}
                            </p>
                          </div>
                          <div className="flex gap-1">
                            <Button size="sm" variant="outline" onClick={() => handleEdit(highlight)}>
                              <Edit className="w-4 h-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button size="sm" variant="outline" className="text-red-500 hover:text-red-600">
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>하이라이트 삭제</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    이 하이라이트를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>취소</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDelete(highlight.id)}>삭제</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </div>
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

export default AdminHighlights;
