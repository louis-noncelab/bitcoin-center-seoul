import { locale as getRootLocale } from "next/root-params";
import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { getRequestConfig } from "next-intl/server";
import { routing } from "./routing";

const dictionaries = {
  ko: () => import("./messages/ko").then((module) => module.default),
  en: () => import("./messages/en").then((module) => module.default),
};

export default getRequestConfig(async ({ locale: explicitLocale }) => {
  const locale = explicitLocale ?? (await getRootLocale());
  if (!hasLocale(routing.locales, locale)) notFound();

  return {
    locale,
    messages: await dictionaries[locale](),
    timeZone: "Asia/Seoul",
  };
});
