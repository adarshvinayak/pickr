import { format, isToday, isTomorrow } from 'date-fns';

const inrFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

/**
 * Format currency with Indian digit grouping and ₹ symbol (e.g. ₹1,58,000)
 */
export function formatRupees(amount: number): string {
  return inrFormatter.format(Math.round(amount));
}

/**
 * Format distance and duration combined e.g. "18.2 km · 45 min"
 */
export function formatDistanceAndDuration(distanceKm: number, durationMin: number): string {
  const kmStr = `${distanceKm.toFixed(1)} km`;
  const minStr = durationMin >= 60 ? `${Math.floor(durationMin / 60)}h ${durationMin % 60}m` : `${durationMin} min`;
  return `${kmStr} · ${minStr}`;
}

/**
 * Format date/time in plain human words e.g. "Today at 3:30 PM", "Tomorrow at 9:00 AM"
 */
export function formatBookingTime(dateOrIso: Date | string): string {
  const date = typeof dateOrIso === 'string' ? new Date(dateOrIso) : dateOrIso;
  if (isToday(date)) {
    return `Today at ${format(date, 'h:mm a')}`;
  }
  if (isTomorrow(date)) {
    return `Tomorrow at ${format(date, 'h:mm a')}`;
  }
  return format(date, 'MMM d, h:mm a');
}
