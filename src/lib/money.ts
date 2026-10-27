/** $1,234.00 */
export function formatMoney(cents: number): string {
  return (cents / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

/** $1,234 (drops .00, keeps real cents) — for cards and chips */
export function formatShort(cents: number): string {
  const whole = cents % 100 === 0;
  return (cents / 100).toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: 2,
  });
}

/** "From $962" / "$499" */
export function priceLabel(min: number, max: number): string {
  return (max > min ? 'From ' : '') + formatShort(min);
}
