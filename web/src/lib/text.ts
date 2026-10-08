export function withoutWordJoiners(value: string): string {
  return value.replaceAll("\u2060", "");
}
