import "server-only";
import { z } from "zod";
import { contentTagsSchema } from "@/lib/content-tags";

export const storedTagsSchema = z.string()
  .transform((value): unknown => JSON.parse(value))
  .pipe(contentTagsSchema);
