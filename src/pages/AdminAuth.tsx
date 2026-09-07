import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Lock, ArrowLeft } from 'lucide-react';
import { adminLogin } from '@/lib/admin';

const AdminAuth = () => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const redirectPath = searchParams.get('redirect');
  const nextPath = redirectPath?.startsWith('/admin/') ? redirectPath : '/admin/events';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // 비밀번호는 서버가 검증한다(.env ADMIN_PASSWORD). 성공하면 adminLogin 이 세션을 저장한다.
    try {
      if (await adminLogin(password)) {
        navigate(nextPath);
      } else {
        setError('잘못된 암호입니다.');
      }
    } catch {
      setError('서버에 연결할 수 없습니다. 잠시 후 다시 시도하세요.');
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
            관리자 페이지에 접근하려면 암호를 입력하세요
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
