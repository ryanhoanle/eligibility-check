/**
 * Money is stored and transmitted as integer cents. Formatting happens at the
 * edge (UI) only. This avoids floating-point drift in benefit math.
 */
export function formatCents(cents: number, locale = 'en-US', currency = 'USD'): string {
  return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(cents / 100);
}

export function remainingCents(limitCents: number, usedCents: number): number {
  return Math.max(0, limitCents - usedCents);
}
