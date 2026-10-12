import { useEffect, useState } from 'react';

// True while the media query matches; false where matchMedia is unavailable (tests, old browsers).
export function useMediaQuery(query) {
  const get = () => (typeof window !== 'undefined' && window.matchMedia ? window.matchMedia(query).matches : false);
  const [matches, setMatches] = useState(get);
  useEffect(() => {
    if (!window.matchMedia) return undefined;
    const mq = window.matchMedia(query);
    const onChange = () => setMatches(mq.matches);
    onChange();
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [query]);
  return matches;
}

// Phone-width screens (below Tailwind's `sm` breakpoint).
export const usePhone = () => useMediaQuery('(max-width: 639px)');
