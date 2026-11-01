import { Followup } from '../types';

/** Human label + colour for a follow-up's state. */
export function followupLabel(f: Followup): { text: string; color: string } {
  switch (f.state) {
    case 'overdue':
      return { text: `Overdue · ${f.days_overdue} day${f.days_overdue === 1 ? '' : 's'}`, color: '#C0504D' };
    case 'due_today':
      return { text: 'Due today', color: '#D99A2B' };
    case 'upcoming':
      return { text: 'Scheduled', color: '#0086C3' };
    case 'done':
      return f.days_late > 0
        ? { text: `Done · ${f.days_late} day${f.days_late === 1 ? '' : 's'} late`, color: '#D99A2B' }
        : { text: 'Done on time', color: '#1E8E5A' };
    case 'rescheduled':
      return { text: f.days_late > 0 ? `Rescheduled · after ${f.days_late}d` : 'Rescheduled', color: '#7C5CBF' };
    default:
      return { text: 'Cancelled', color: '#8A98A6' };
  }
}

/** YYYY-MM-DD of a Date in LOCAL time (toISOString would use UTC and can be a day off). */
export function localDateString(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** YYYY-MM-DD for today + n days (local time). */
export function dateInDays(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
