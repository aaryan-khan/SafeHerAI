/**
 * General personal-safety tips shown on the Home screen, one per day.
 * Written by hand (not AI-generated). Keep them practical, calm and non-blaming.
 */
export const SAFETY_TIPS: string[] = [
  "Before travelling late, share your plans or live location with someone you trust.",
  'Save 112 (emergency) and 181 (Women Helpline) in your phone contacts.',
  'In a cab or auto, check that the number plate matches your booking before you get in.',
  'Keep your phone charged. A small power bank helps on long days out.',
  "Trust your instincts. It's always okay to change your plans or ask for help.",
  'Agree on a simple code word with a friend that means "please call me now".',
  'When possible, wait for transport in well-lit places where other people are around.',
];

/** The same tip all day, a different one the next day. */
export function tipForDate(date: Date): string {
  const startOfYear = new Date(date.getFullYear(), 0, 0);
  const dayOfYear = Math.floor((date.getTime() - startOfYear.getTime()) / 86_400_000);
  return SAFETY_TIPS[dayOfYear % SAFETY_TIPS.length];
}

/** "Good morning" / "Good afternoon" / "Good evening", from the phone's local time. */
export function greetingFor(date: Date): string {
  const hour = date.getHours();
  if (hour >= 5 && hour < 12) return 'Good morning';
  if (hour >= 12 && hour < 17) return 'Good afternoon';
  return 'Good evening';
}
