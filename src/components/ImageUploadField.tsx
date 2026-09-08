import { useRef, useState } from 'react';
import { ImagePlus, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { uploadImage } from '@/lib/admin';

interface ImageUploadFieldProps {
  value: string;
  onChange: (path: string) => void;
  label?: string;
  required?: boolean;
}

const ACCEPT = 'image/jpeg,image/png,image/webp,image/gif,image/avif';

// 어드민 폼용 이미지 필드. 파일을 고르면 바로 /api/images 로 올리고, 저장된 경로를 value로 넘긴다.
const ImageUploadField = ({ value, onChange, label = '이미지', required }: ImageUploadFieldProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState('');
  const isExternal = /^https?:\/\//i.test(value);

  const handleFile = async (file?: File | null) => {
    if (!file) return;
    setUploading(true);
    setError('');
    try {
      const uploaded = await uploadImage(file);
      onChange(uploaded.path);
    } catch (e) {
      setError(e instanceof Error ? e.message : '이미지 업로드에 실패했습니다.');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const openPicker = () => inputRef.current?.click();

  return (
    <div>
      <label className="text-sm font-medium mb-2 block">
        {label}
        {required && ' *'}
      </label>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
      {required && (
        <input
          type="text"
          tabIndex={-1}
          value={value}
          required
          readOnly
          aria-hidden="true"
          className="sr-only"
        />
      )}

      {value ? (
        <div>
          <img src={value} alt="" className="aspect-video w-full rounded-md object-cover border" />
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={openPicker} disabled={uploading}>
              {uploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ImagePlus className="w-4 h-4 mr-2" />}
              {uploading ? '업로드 중...' : '다른 이미지로 교체'}
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => onChange('')} disabled={uploading}>
              <X className="w-4 h-4 mr-1" />
              제거
            </Button>
            {isExternal && (
              <span className="text-xs text-muted-foreground">
                외부 링크 이미지입니다. 링크가 사라지면 함께 사라지니 파일로 교체하세요.
              </span>
            )}
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={openPicker}
          disabled={uploading}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => { e.preventDefault(); setDragging(false); handleFile(e.dataTransfer.files?.[0]); }}
          className={`min-h-[9rem] w-full rounded-md border border-dashed py-8 flex flex-col items-center justify-center gap-2 text-sm text-muted-foreground transition-colors hover:bg-muted/40 disabled:opacity-60 ${dragging ? 'border-bitcoin bg-bitcoin/5' : ''}`}
        >
          {uploading ? <Loader2 className="w-6 h-6 animate-spin" /> : <ImagePlus className="w-6 h-6" />}
          <span>{uploading ? '업로드 중...' : '클릭하거나 파일을 끌어다 놓으세요'}</span>
          {!uploading && <span className="text-xs">jpg · png · webp · gif · 20MB 이하 · 1600px로 자동 변환</span>}
        </button>
      )}

      {error && <p className="text-sm text-red-400 mt-2">{error}</p>}
    </div>
  );
};

export default ImageUploadField;
