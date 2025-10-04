import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Lock, ArrowLeft } from 'lucide-react';

const AdminAuth = () => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const correctPassword = 'qlxmzhdlstpsxjtjdnf1021';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // 간단한 지연 효과
    await new Promise(resolve => setTimeout(resolve, 500));

    if (password === correctPassword) {
      // 세션 스토리지에 인증 상태 저장
      sessionStorage.setItem('admin_authenticated', 'true');
      navigate('/admin/events');
    } else {
      setError('잘못된 암호입니다.');
    }
    
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-12 h-12 bg-bitcoin/10 rounded-full flex items-center justify-center">
            <Lock className="w-6 h-6 text-bitcoin" />
          </div>
          <CardTitle>관리자 인증</CardTitle>
          <CardDescription>
            이벤트 일정을 관리하려면 암호를 입력하세요
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Input
                type="password"
                placeholder="암호를 입력하세요"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full"
                required
              />
              {error && (
                <p className="text-sm text-red-500 mt-2">{error}</p>
              )}
            </div>
            
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/')}
                className="flex-1"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                홈으로
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="flex-1 bg-bitcoin hover:bg-bitcoin/90"
              >
                {loading ? '확인 중...' : '확인'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminAuth;
