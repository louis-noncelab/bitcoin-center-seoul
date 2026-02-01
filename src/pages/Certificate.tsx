import { useEffect, useState } from 'react';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Download } from 'lucide-react';

interface CertificateFile {
  name: string;
  path: string;
}

const Certificate = () => {
  const [files, setFiles] = useState<CertificateFile[]>([]);

  useEffect(() => {
    // Certificate 폴더의 파일 목록
    const certificateFiles: CertificateFile[] = [
      { name: 'BPEP-001-0001.pdf', path: '/certificate/BPEP-001-0001.pdf' },
      { name: 'BPEP-001-0002.pdf', path: '/certificate/BPEP-001-0002.pdf' },
      { name: 'BPEP-001-0003.pdf', path: '/certificate/BPEP-001-0003.pdf' },
      { name: 'BPEP-001-0004.pdf', path: '/certificate/BPEP-001-0004.pdf' },
      { name: 'BPEP-001-0005.pdf', path: '/certificate/BPEP-001-0005.pdf' },
    ];
    setFiles(certificateFiles);
  }, []);

  const handleDownload = (path: string, name: string) => {
    const link = document.createElement('a');
    link.href = path;
    link.download = name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold mb-4">인증서</h1>
            <p className="text-muted-foreground">
              비트코인 센터 서울의 인증서를 확인하실 수 있습니다.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {files.map((file, index) => (
              <Card key={index} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="h-5 w-5 text-primary" />
                    <CardTitle className="text-lg">{file.name}</CardTitle>
                  </div>
                  <CardDescription>
                    인증서 파일
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => window.open(file.path, '_blank')}
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    보기
                  </Button>
                  <Button
                    variant="default"
                    className="flex-1"
                    onClick={() => handleDownload(file.path, file.name)}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    다운로드
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          {files.length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground">인증서 파일이 없습니다.</p>
            </div>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Certificate;
