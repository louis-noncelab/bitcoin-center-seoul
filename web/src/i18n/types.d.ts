import type messages from "./messages/ko";
import type { Locale } from "./routing";

declare module "next-intl" {
  interface AppConfig {
    Locale: Locale;
    Messages: typeof messages;
  }
}
