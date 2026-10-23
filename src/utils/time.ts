/**
 * Formats a submission or notice timestamp into the user's local browser timezone.
 * Even if an older record was saved when the Docker container was in UTC,
 * extracting the epoch milliseconds from `id` (e.g. `sub_1792498536349`)
 * guarantees accurate local-time display on iPad / mobile browsers.
 */
export function formatLocalTimestamp(id?: string, fallbackTimestamp?: string): string {
  if (id) {
    const match = id.match(/^(?:sub|notice)_(\d{10,15})$/);
    if (match) {
      const epochMs = Number(match[1]);
      if (Number.isFinite(epochMs) && epochMs > 0) {
        return new Date(epochMs).toLocaleString('zh-CN', { hour12: false });
      }
    }
  }
  return fallbackTimestamp || new Date().toLocaleString('zh-CN', { hour12: false });
}

/**
 * Returns today's date string (YYYY-MM-DD) in the browser's local timezone.
 */
export function getBrowserLocalDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Returns the browser's IANA timezone name (e.g. "Asia/Shanghai").
 */
export function getBrowserTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Shanghai';
  } catch {
    return 'Asia/Shanghai';
  }
}
