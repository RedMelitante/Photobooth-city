import { useEffect, useState } from 'react';

/**
 * False during SSR and the hydration render, true afterwards. Islands that
 * read browser-only state (cart, session) render their server markup until
 * this flips, so hydration never mismatches.
 */
export function useHydrated(): boolean {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  return hydrated;
}
