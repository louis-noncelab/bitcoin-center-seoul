import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "없는 관리 화면 | Bitcoin Center Seoul",
  robots: { index: false, follow: false },
};

export default function AdminNotFound() {
  return <main id="main" lang="ko" tabIndex={-1} className="container events-admin-page">
    <h1>이 관리 화면은 없습니다</h1>
    <p>주소를 다시 확인해 주세요.</p>
  </main>;
}
