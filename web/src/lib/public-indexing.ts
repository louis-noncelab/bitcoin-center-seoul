export function publicIndexingEnabled(): boolean {
  return process.env.BCS_PUBLIC_INDEXING === "true";
}
