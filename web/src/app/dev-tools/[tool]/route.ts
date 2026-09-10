import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ tool: string }> },
) {
  // This route never exposes executable inspection tooling in production.
  if (process.env.NODE_ENV !== "development") {
    return new Response(null, { status: 404 });
  }

  const { tool } = await params;
  if (tool !== "react-scan" && tool !== "react-grab") {
    return new Response(null, { status: 404 });
  }

  const filename = tool === "react-scan" ? "auto.global.js" : "index.global.js";
  const source = join(process.cwd(), "node_modules", tool, "dist", filename);

  return new Response(await readFile(source, "utf8"), {
    headers: {
      "Content-Type": "text/javascript; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}
