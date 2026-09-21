import "server-only";

export function csvCell(value: string | number | bigint | Date | null | undefined): string {
  let text = value instanceof Date
    ? new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false }).format(value).replace(" ", " ")
    : value == null ? "" : String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll("\"", "\"\"")}"`;
}

export function csvResponse(filename: string, header: readonly string[], rows: readonly (readonly string[])[], total: number, truncated: boolean): Response {
  const summary = [
    [csvCell("total"), csvCell(total)].join(","),
    [csvCell("truncated"), csvCell(truncated ? "1" : "0")].join(","),
    "",
  ];
  const body = `\uFEFF${[...summary, header.map(csvCell).join(","), ...rows.map((row) => row.map(csvCell).join(","))].join("\n")}\n`;
  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer",
    },
  });
}

export function seoulStamp(value: Date): string {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(value);
}
