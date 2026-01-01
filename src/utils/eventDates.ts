// src/utils/eventDates.ts
// Helpers for parsing and comparing event dates.

export function parseEventDate(event?: string): Date | null {
  if (!event) return null;
  const trimmed = event.trim();
  if (!trimmed) return null;

  const compact = trimmed.match(/^(\d{2})(\d{2})(\d{2})(?:[_\s-]?(\d{2})(\d{2}))?$/);
  if (compact) {
    const year = 2000 + Number(compact[1]);
    const month = Number(compact[2]);
    const day = Number(compact[3]);
    const hour = compact[4] ? Number(compact[4]) : 0;
    const minute = compact[5] ? Number(compact[5]) : 0;
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return new Date(year, month - 1, day, hour, minute);
    }
  }

  const iso = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2}))?$/);
  if (iso) {
    const year = Number(iso[1]);
    const month = Number(iso[2]);
    const day = Number(iso[3]);
    const hour = iso[4] ? Number(iso[4]) : 0;
    const minute = iso[5] ? Number(iso[5]) : 0;
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return new Date(year, month - 1, day, hour, minute);
    }
  }

  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function parseEventDates(event?: string): Date[] {
  if (!event) return [];
  return event
    .split(',')
    .map((part) => parseEventDate(part))
    .filter((date): date is Date => Boolean(date));
}

export function startOfWeekMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay(); // 0 = Sunday
  const diff = (day + 6) % 7;
  d.setDate(d.getDate() - diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate();
}
