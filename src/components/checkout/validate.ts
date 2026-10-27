// Inline validation for the checkout fields (run on blur and on Continue).
import type { Address, BillingAddress } from '@/lib/checkout-session';

export type Msg = string | null;

const required = (msg: string) => (v: string): Msg => (v.trim() ? null : msg);

export function email(v: string): Msg {
  if (!v.trim()) return 'Enter an email address';
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()) ? null : 'Enter a valid email, like you@yourbusiness.com';
}

export function zip(v: string): Msg {
  if (!v.trim()) return 'Enter a ZIP code';
  return /^\d{5}(-?\d{4})?$/.test(v.trim()) ? null : 'Enter a 5-digit ZIP code';
}

export function phone(v: string): Msg {
  const d = v.replace(/\D/g, '');
  if (!d) return 'Enter a phone number';
  return d.length === 10 || (d.length === 11 && d[0] === '1') ? null : 'Enter a 10-digit US phone number';
}

export const ADDRESS_RULES: Partial<Record<keyof Address, (v: string) => Msg>> = {
  first: required('Enter a first name'),
  last: required('Enter a last name'),
  line1: required('Enter a street address'),
  city: required('Enter a city'),
  state: required('Select a state'),
  zip,
  phone,
};

export const BILLING_RULES: Record<keyof BillingAddress, (v: string) => Msg> = {
  line1: required('Enter a street address'),
  city: required('Enter a city'),
  state: required('Select a state'),
  zip,
};

function luhn(d: string): boolean {
  let sum = 0;
  for (let i = 0; i < d.length; i++) {
    let n = +d[d.length - 1 - i];
    if (i % 2) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
  }
  return sum % 10 === 0;
}

export function cardNumber(v: string): Msg {
  const d = v.replace(/\D/g, '');
  if (!d) return 'Enter a card number';
  return d.length >= 14 && d.length <= 19 && luhn(d) ? null : 'Your card number is invalid';
}

export function expiry(v: string): Msg {
  const m = v.replace(/\s/g, '').match(/^(\d{2})\/(\d{2})$/);
  if (!v.trim()) return 'Enter an expiration date';
  if (!m) return 'Use the format MM / YY';
  const month = +m[1];
  const year = 2000 + +m[2];
  if (month < 1 || month > 12) return 'Use the format MM / YY';
  const now = new Date();
  if (year < now.getFullYear() || (year === now.getFullYear() && month < now.getMonth() + 1)) return 'Your card’s expiration date is in the past';
  return null;
}

export function cvc(v: string, amex: boolean): Msg {
  const d = v.replace(/\D/g, '');
  if (!d) return 'Enter the security code';
  return d.length === (amex ? 4 : 3) || (!amex && d.length === 4) ? null : 'Your card’s security code is incomplete';
}

export function formatCard(v: string): string {
  return v.replace(/\D/g, '').slice(0, 19).replace(/(\d{4})(?=\d)/g, '$1 ');
}

export function formatExpiry(v: string, prev: string): string {
  const d = v.replace(/\D/g, '').slice(0, 4);
  if (d.length < 2) return d;
  // deleting past the slash
  if (d.length === 2 && prev.length > v.length) return d;
  return `${d.slice(0, 2)} / ${d.slice(2)}`;
}
