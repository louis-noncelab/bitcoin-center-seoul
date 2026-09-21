import "server-only";
import { HttpError } from "@/server/http";

export const JSON_PAGE_SIZE_DEFAULT = 50;
export const JSON_PAGE_SIZE_MAX = 100;
export const CSV_ROW_LIMIT = 5000;

const dayPattern = /^(\d{4})-(\d{2})-(\d{2})$/;

export type AdminListQuery = {
  readonly q: string;
  readonly page: number;
  readonly pageSize: number;
  readonly format: "json" | "csv";
  readonly from: Date | null;
  readonly to: Date | null;
  readonly sortDir: "asc" | "desc";
};

function integer(value: string | null, fallback: number): number {
  if (value === null || value === "") return fallback;
  if (!/^[0-9]{1,6}$/.test(value)) throw new HttpError(400, "INVALID_INPUT", "페이지 값을 확인해 주세요. / Check the page values.");
  return Number(value);
}

function seoulDay(value: string, end: boolean): Date {
  const match = dayPattern.exec(value);
  if (!match) throw new HttpError(400, "INVALID_INPUT", "날짜 형식을 확인해 주세요. / Use YYYY-MM-DD dates.");
  const date = new Date(`${match[1]}-${match[2]}-${match[3]}T${end ? "23:59:59.999" : "00:00:00.000"}+09:00`);
  if (Number.isNaN(date.getTime())) throw new HttpError(400, "INVALID_INPUT", "날짜 형식을 확인해 주세요. / Use YYYY-MM-DD dates.");
  return date;
}

export function parseAdminListQuery(url: URL): AdminListQuery {
  const format = url.searchParams.get("format") === "csv" ? "csv" : "json";
  const q = (url.searchParams.get("q") ?? "").trim();
  if (q.length > 100) throw new HttpError(400, "INVALID_INPUT", "검색어가 너무 깁니다. / Search is too long.");
  const page = Math.max(1, integer(url.searchParams.get("page"), 1));
  const requestedSize = integer(url.searchParams.get("pageSize"), JSON_PAGE_SIZE_DEFAULT);
  const pageSize = format === "csv"
    ? CSV_ROW_LIMIT
    : Math.min(JSON_PAGE_SIZE_MAX, Math.max(1, requestedSize));
  const fromValue = url.searchParams.get("from");
  const toValue = url.searchParams.get("to");
  const from = fromValue ? seoulDay(fromValue, false) : null;
  const to = toValue ? seoulDay(toValue, true) : null;
  if (from && to && from > to) throw new HttpError(400, "INVALID_INPUT", "기간을 확인해 주세요. / Check the date range.");
  const sortDir = url.searchParams.get("order") === "asc" ? "asc" : "desc";
  return { q, page: format === "csv" ? 1 : page, pageSize, format, from, to, sortDir };
}

export function searchContains(q: string) {
  return { contains: q, mode: "insensitive" as const };
}

export function createdAtFilter(query: AdminListQuery) {
  if (!query.from && !query.to) return undefined;
  return {
    ...(query.from ? { gte: query.from } : {}),
    ...(query.to ? { lte: query.to } : {}),
  };
}
