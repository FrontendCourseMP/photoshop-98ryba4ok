import { useEffect, useRef } from 'react';
import { isMac } from '../utils/platform';

type HotkeyMap = Record<string, () => void>;

export function useHotkeys(map: HotkeyMap) {
  const ref = useRef(map);
  ref.current = map;

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const modifier = isMac ? e.metaKey : e.ctrlKey;
      if (!modifier) return;

      // normalize: single char → lowercase, special keys (Enter, Escape…) → as-is
      const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;

      if (ref.current[key]) {
        e.preventDefault();
        ref.current[key]();
      }
    };

    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);
}
