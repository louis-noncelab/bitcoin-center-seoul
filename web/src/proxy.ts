import createMiddleware from "next-intl/middleware";
import { NextRequest, NextResponse } from "next/server";
import { hasLocale } from "next-intl";
import { randomBytes } from "node:crypto";
import { routing } from "./i18n/routing";
import { isPrivateAnalyticsPath } from "./lib/analytics-path";
import { configuredOrigin } from "./server/events/config";

const intlProxy = createMiddleware(routing);

export default function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const segment = pathname.split("/")[1];
  const secure = process.env.NODE_ENV === "production"
    && Boolean(process.env.APP_ORIGIN)
    && configuredOrigin().protocol === "https:";
  let response: NextResponse;

  if (
    /^\/(?:api|_next|dev-tools|images|brand|fonts|certificate|og)(?:\/|$)/.test(pathname)
    || /^\/(?:robots\.txt|sitemap\.xml|favicon\.ico|icon\.png|apple-icon\.png)$/.test(pathname)
  ) {
    response = NextResponse.next();
  } else {
    const nonce = randomBytes(16).toString("base64");
    const development = process.env.NODE_ENV === "development";
    const postcodeFrames = /^\/(?:ko|en)\/checkout\/?$/.test(pathname)
      ? ` https://postcode.map.kakao.com${secure ? "" : " http://postcode.map.kakao.com"}`
      : "";
    // Private paths stay excluded even when an unsupported locale rewrites to a public 404.
    const privatePage = isPrivateAnalyticsPath(pathname);
    const tagManager = !privatePage && process.env.NEXT_PUBLIC_ANALYTICS_APPROVED === "true" && process.env.NEXT_PUBLIC_GTM_ID?.trim();
    const policy = [
      "default-src 'self'",
      `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${tagManager ? " https://www.googletagmanager.com" : ""}${development ? " 'unsafe-eval'" : ""}`,
      "style-src 'self' 'unsafe-inline'",
      `img-src 'self' data: blob:${tagManager ? " https://*.google-analytics.com https://*.googletagmanager.com" : ""}`,
      `connect-src 'self'${tagManager ? " https://*.google-analytics.com https://*.analytics.google.com https://*.googletagmanager.com https://www.google.com/g/collect" : ""}${development ? " ws: wss:" : ""}`,
      "object-src 'none'",
      "base-uri 'none'",
      "form-action 'self'",
      `frame-src https://www.google.com/maps/embed https://www.youtube-nocookie.com/embed/${postcodeFrames}`,
      "frame-ancestors 'none'",
      ...(secure ? ["upgrade-insecure-requests"] : []),
    ].join("; ");
    const headers = new Headers(request.headers);
    headers.set("x-bcs-pathname", pathname);
    headers.set("x-nonce", nonce);
    headers.set("Content-Security-Policy", policy);
    if (segment && /^[a-z]{2}(?:-[a-z]{2})?$/i.test(segment) && !hasLocale(routing.locales, segment)) {
      const url = request.nextUrl.clone();
      url.pathname = "/ko/404";
      response = privatePage
        ? NextResponse.next({ request: { headers } })
        : NextResponse.rewrite(url, { request: { headers } });
      response.headers.set("X-Robots-Tag", "noindex, nofollow");
    } else {
      response = intlProxy(new NextRequest(request, { headers }));
    }
    response.headers.set("Content-Security-Policy", policy);
    if (privatePage) response.headers.set("Referrer-Policy", "no-referrer");
  }

  if (/^\/(?:(?:ko|en|api)\/)?admin(?:\/|$)/.test(pathname) || /^\/certificate(?:\/|$)/.test(pathname)) {
    response.headers.set("X-Robots-Tag", "noindex, nofollow");
  }
  if (secure) response.headers.set("Strict-Transport-Security", "max-age=31536000");
  return response;
}

export const config = {
  matcher: ["/:path*"],
};
