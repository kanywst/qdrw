import { useState, useEffect } from 'react';
import type { ColorScheme } from '../types';

const STORAGE_KEY = 'colorScheme';

function getSystemScheme(): ColorScheme {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function readStoredOverride(): ColorScheme | null {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === 'light' || stored === 'dark') return stored;
  return null;
}

export function useColorScheme(): {
  colorScheme: ColorScheme;
  override: ColorScheme | null;
  setOverride: (scheme: ColorScheme | null) => void;
} {
  const [systemScheme, setSystemScheme] = useState<ColorScheme>(getSystemScheme);
  const [override, setOverrideState] = useState<ColorScheme | null>(readStoredOverride);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => {
      setSystemScheme(e.matches ? 'dark' : 'light');
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const setOverride = (scheme: ColorScheme | null) => {
    if (scheme === null) {
      localStorage.removeItem(STORAGE_KEY);
    } else {
      localStorage.setItem(STORAGE_KEY, scheme);
    }
    setOverrideState(scheme);
  };

  const colorScheme = override ?? systemScheme;

  return { colorScheme, override, setOverride };
}
