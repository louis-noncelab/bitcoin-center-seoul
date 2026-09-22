import { shareKinds, type ShareKind } from "@/content/share";
import { libraryKinds } from "@/lib/collection-contract";
import { getProduct } from "@/server/catalog";
import { getCollectionByPath } from "@/server/collection";
import { getEventByPath, getHighlightByPath } from "@/server/events";
import { HttpError } from "@/server/http";
import { reviewBySlug } from "@/server/reviews";
import { renderShareCard } from "@/server/share-card";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const identifier = /^(?:[1-9]\d{0,9}|[a-z0-9]+(?:-[a-z0-9]+)*)$/;

function isShareKind(value: string): value is ShareKind {
  return (shareKinds as readonly string[]).includes(value);
}

async function sourceImage(kind: ShareKind, id: string): Promise<string | null> {
  if (kind === "programs") {
    const event = await getEventByPath(id);
    return event ? event.images[0] || event.image : null;
  }
  if (kind === "journal") {
    const highlight = await getHighlightByPath(id);
    return highlight ? highlight.images[0] || highlight.image : null;
  }
  if (kind === "shop") {
    try {
      const product = await getProduct(id);
      return product.images[0] || product.imageUrl;
    } catch (error) {
      if (error instanceof HttpError && error.status === 404) return null;
      throw error;
    }
  }
  if (kind === "reviews") {
    const review = await reviewBySlug(id);
    return review ? review.image : null;
  }
  const kinds = kind === "goods" ? ["goods"] as const : kind === "boardgame" ? ["boardgame"] as const : libraryKinds;
  const item = await getCollectionByPath(id, false, kinds);
  return item ? item.images[0] ?? "" : null;
}

function jpeg(body: Buffer): Response {
  return new Response(new Uint8Array(body), {
    headers: {
      "Content-Type": "image/jpeg",
      "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export async function GET(_request: Request, context: { params: Promise<{ kind: string; id: string }> }): Promise<Response> {
  const { kind, id } = await context.params;
  if (!isShareKind(kind) || !identifier.test(id)) return new Response(null, { status: 404 });
  const image = await sourceImage(kind, id);
  if (image === null) return new Response(null, { status: 404 });
  return jpeg(await renderShareCard(image));
}
