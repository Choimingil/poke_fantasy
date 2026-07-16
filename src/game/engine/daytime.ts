export type TimeOfDay = 'morning' | 'day' | 'evening' | 'night';

const TIMES: TimeOfDay[] = ['morning', 'day', 'evening', 'night'];

export const TIME_LABEL: Record<TimeOfDay, string> = {
  morning: '아침',
  day: '낮',
  evening: '저녁',
  night: '밤',
};

export function pickRandomTime(rng: () => number): TimeOfDay {
  return TIMES[Math.floor(rng() * TIMES.length)] ?? 'day';
}
