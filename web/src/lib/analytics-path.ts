export function isPrivateAnalyticsPath(pathname: string): boolean {
  try {
    return /^\/(?:[^/]+\/)?(?:admin|orders\/confirm)(?:\/|$)/.test(decodeURIComponent(pathname));
  } catch {
    return true;
  }
}
