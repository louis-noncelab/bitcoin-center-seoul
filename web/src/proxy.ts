import createMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";
import { hasLocale } from "next-intl";
import { routing } from "./i18n/routing";

const intlProxy = createMiddleware(routing);

export default function proxy(request: NextRequest) {
  const segment = request.nextUrl.pathname.split("/")[1];
  if (
    segment &&
    /^[a-z]{2}(?:-[a-z]{2})?$/i.test(segment) &&
    !hasLocale(routing.locales, segment)
  ) {
    return new NextResponse(null, { status: 404 });
  }

  return intlProxy(request);
}

export const config = {
  matcher: ["/((?!api|dev-tools|_next|.*\\..*).*)"],
};
