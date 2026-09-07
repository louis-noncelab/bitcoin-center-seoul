// 관리자 세션과 관리자 전용 API 호출 헬퍼.
// 비밀번호는 서버(.env ADMIN_PASSWORD)가 검증하고, 성공하면 sessionStorage에 토큰으로 보관해
// 변경 요청(POST/PUT/DELETE/업로드)마다 x-admin-token 헤더로 보낸다.

const TOKEN_KEY = 'admin_token';
const AUTH_FLAG_KEY = 'admin_authenticated';

export const getAdminToken = () => sessionStorage.getItem(TOKEN_KEY) || '';

export const isAdminAuthenticated = () =>
  sessionStorage.getItem(AUTH_FLAG_KEY) === 'true' && !!getAdminToken();

export const clearAdminSession = () => {
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(AUTH_FLAG_KEY);
};

export async function adminLogin(password: string): Promise<boolean> {
  const response = await fetch('/api/admin/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  });
  if (!response.ok) return false;
  sessionStorage.setItem(TOKEN_KEY, password);
  sessionStorage.setItem(AUTH_FLAG_KEY, 'true');
  return true;
}

// fetch와 같지만 관리자 토큰을 붙이고, 401이면 세션을 지우고 로그인 화면으로 보낸다.
export async function adminFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  headers.set('x-admin-token', getAdminToken());
  const response = await fetch(input, { ...init, headers });
  if (response.status === 401) {
    clearAdminSession();
    window.location.assign(`/admin/auth?redirect=${encodeURIComponent(window.location.pathname)}`);
  }
  return response;
}

export interface UploadedImage {
  path: string;
  thumb: string;
  width: number;
  height: number;
  bytes: number;
}

// 파일을 서버에 올리고 저장된 경로를 받는다. 리사이즈·webp 변환은 서버가 한다.
export async function uploadImage(file: File): Promise<UploadedImage> {
  const form = new FormData();
  form.append('file', file);
  const response = await adminFetch('/api/images', { method: 'POST', body: form });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || `이미지 업로드에 실패했습니다. (${response.status})`);
  }
  return data as UploadedImage;
}
