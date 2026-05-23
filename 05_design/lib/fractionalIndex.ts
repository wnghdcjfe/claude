import { generateKeyBetween } from 'fractional-indexing';

export function getKeyBetween(a: string | null, b: string | null): string {
  return generateKeyBetween(a, b);
}

export function getKeyAtStart(): string {
  return generateKeyBetween(null, null);
}

export function getKeyAtEnd(last: string | null): string {
  return generateKeyBetween(last, null);
}
