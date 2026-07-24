export function parseUTCDate(dateStr: string | number | Date | null | undefined): Date {
  if (!dateStr) return new Date();
  if (dateStr instanceof Date) return dateStr;
  if (typeof dateStr === "number") return new Date(dateStr);
  let str = String(dateStr).trim();
  if (!str) return new Date();

  // If string has date + time without timezone offset (e.g. "2026-07-22 17:14:12" or "2026-07-22T17:14:12.345")
  // appending Z ensures JavaScript parses it as UTC, so browser converts accurately to user's local timezone.
  if (!str.endsWith("Z") && !/[+-]\d{2}:?\d{2}$/.test(str)) {
    str = str.replace(" ", "T") + "Z";
  }
  const d = new Date(str);
  return isNaN(d.getTime()) ? new Date(dateStr) : d;
}

export function formatMessageTime(dateStr: string | number | Date | null | undefined): string {
  const d = parseUTCDate(dateStr);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function formatMessageDate(dateStr: string | number | Date | null | undefined): string {
  const d = parseUTCDate(dateStr);
  return d.toLocaleDateString([], { day: "numeric", month: "long" });
}

export function getMessageDateKey(dateStr: string | number | Date | null | undefined): string {
  const d = parseUTCDate(dateStr);
  return d.toDateString();
}
