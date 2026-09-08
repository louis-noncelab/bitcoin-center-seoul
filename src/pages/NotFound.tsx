import { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";

const content = {
  ko: {
    message: "이 페이지를 찾을 수 없습니다.",
    home: "홈으로",
  },
  en: {
    message: "This page could not be found.",
    home: "Back to home",
  },
};

const NotFound = () => {
  const location = useLocation();
  const { language } = useLanguage();
  const t = content[language];

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-6">
      <div className="motion-enter flex flex-col items-center text-center gap-4">
        <h1 className="text-6xl font-semibold tracking-tight">404</h1>
        <p>{t.message}</p>
        <p className="text-muted-foreground text-sm font-mono">
          {location.pathname}
        </p>
        <Link
          to="/"
          className="motion-press inline-flex rounded-md bg-bitcoin px-4 py-2 text-sm font-medium text-bitcoin-foreground hover:bg-bitcoin/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          {t.home}
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
