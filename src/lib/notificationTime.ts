import { format, formatDistanceToNowStrict, isToday, isYesterday } from "date-fns";

/**
 * When a notification arrived, for showing under it: "Today, 2:45 pm · 5 min ago",
 * "Yesterday, 9:10 am · 1 day ago", "12 Nov, 4:00 pm · 5 days ago". null when the time is unknown.
 */
export function arrivedAt(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  const time = format(date, "h:mm a").toLowerCase();
  const day = isToday(date) ? "Today" : isYesterday(date) ? "Yesterday" : format(date, "d MMM");
  const seconds = (Date.now() - date.getTime()) / 1000;
  const ago = seconds < 60 ? "just now" : `${formatDistanceToNowStrict(date).replace(/ minutes?/, " min").replace(/ hours?/, " h")} ago`;
  return `${day}, ${time} · ${ago}`;
}
