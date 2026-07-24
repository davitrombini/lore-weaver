export function formatBR(iso: string | undefined | null): string {
  if (!iso) return "";
  // Expected format YYYY-MM-DD from <input type="date">
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return iso;
  return `${m[3]}/${m[2]}/${m[1]}`;
}