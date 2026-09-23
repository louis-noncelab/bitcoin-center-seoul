import type { Locale } from "@/i18n/routing";
import { callingCodes } from "@/lib/phone-countries";

export type PhoneCountry = { readonly code: string; readonly dial: string; readonly name: string; readonly search: string };

const preferred = ["KR", "US", "GB", "CA", "AU"];

export function phoneCountries(locale: Locale): PhoneCountry[] {
  const names = new Intl.DisplayNames([locale], { type: "region" });
  return Object.entries(callingCodes).map(([code, digits]) => {
    const name = names.of(code) ?? code;
    const dial = `+${digits}`;
    return { code, dial, name, search: `${name} ${code} ${dial}`.toLocaleLowerCase(locale) };
  }).sort((a, b) => {
    const first = preferred.indexOf(a.code);
    const second = preferred.indexOf(b.code);
    if (first !== -1 || second !== -1) return (first === -1 ? preferred.length : first) - (second === -1 ? preferred.length : second);
    return a.name.localeCompare(b.name, locale);
  });
}

export function phoneEntry(value: string, country: string): { readonly country: string; readonly national: string } {
  const raw = value.trimStart();
  const international = raw.match(/^(?:\+|00)(\d+)/);
  if (international) {
    const digits = international[1] ?? "";
    const matches = Object.entries(callingCodes).filter(([, dial]) => digits.startsWith(dial));
    matches.sort(([aCode, aDial], [bCode, bDial]) => bDial.length - aDial.length || Number(bCode === country) - Number(aCode === country) || (preferred.indexOf(aCode) < 0 ? preferred.length : preferred.indexOf(aCode)) - (preferred.indexOf(bCode) < 0 ? preferred.length : preferred.indexOf(bCode)));
    const match = matches[0];
    if (match) {
      const [code, dial] = match;
      const stripped = raw.replace(/^(?:\+|00)\d+/, digits.slice(dial.length));
      return { country: code, national: stripped.replace(/[^0-9() .-]/g, "").trimStart().slice(0, 34) };
    }
    return { country, national: raw.slice(0, 34) };
  }
  return { country, national: raw.replace(/[^0-9() .-]/g, "").slice(0, 34) };
}

export function fullPhone(country: string, national: string): string {
  const dial = callingCodes[country];
  const trimmed = national.trim();
  return dial && trimmed && !/^(?:\+|00)/.test(trimmed) ? `+${dial} ${trimmed}` : "";
}
