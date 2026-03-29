import { renderHook, act } from '@testing-library/react';
import { useColorScheme } from '../hooks/useColorScheme';

function mockMatchMedia(matches: boolean) {
  const listeners: ((e: MediaQueryListEvent) => void)[] = [];
  const mq = {
    matches,
    addEventListener: vi.fn((_: string, cb: (e: MediaQueryListEvent) => void) => {
      listeners.push(cb);
    }),
    removeEventListener: vi.fn(),
    dispatchChange: (newMatches: boolean) => {
      listeners.forEach((cb) => cb({ matches: newMatches } as MediaQueryListEvent));
    },
  };
  window.matchMedia = vi.fn().mockReturnValue(mq);
  return mq;
}

beforeEach(() => {
  // jsdom may not support localStorage.clear(); remove the key directly
  localStorage.removeItem('colorScheme');
  vi.restoreAllMocks();
});

describe('useColorScheme', () => {
  describe('system color scheme initialization', () => {
    it('returns dark when system prefers dark mode', () => {
      mockMatchMedia(true);
      const { result } = renderHook(() => useColorScheme());
      expect(result.current.colorScheme).toBe('dark');
    });

    it('returns light when system prefers light mode', () => {
      mockMatchMedia(false);
      const { result } = renderHook(() => useColorScheme());
      expect(result.current.colorScheme).toBe('light');
    });
  });

  describe('localStorage override', () => {
    it('reads override from localStorage on mount (override wins over system)', () => {
      // System is dark, but localStorage says light
      mockMatchMedia(true);
      localStorage.setItem('colorScheme', 'light');

      const { result } = renderHook(() => useColorScheme());
      expect(result.current.colorScheme).toBe('light');
    });

    it('setOverride updates colorScheme and persists to localStorage', () => {
      mockMatchMedia(true); // system dark
      localStorage.setItem('colorScheme', 'light');

      const { result } = renderHook(() => useColorScheme());
      expect(result.current.colorScheme).toBe('light');

      act(() => {
        result.current.setOverride('dark');
      });

      expect(result.current.colorScheme).toBe('dark');
      expect(localStorage.getItem('colorScheme')).toBe('dark');
    });

    it('setOverride(null) clears override and removes localStorage key', () => {
      mockMatchMedia(false); // system light
      localStorage.setItem('colorScheme', 'dark');

      const { result } = renderHook(() => useColorScheme());
      expect(result.current.colorScheme).toBe('dark');

      act(() => {
        result.current.setOverride(null);
      });

      expect(result.current.override).toBeNull();
      expect(localStorage.getItem('colorScheme')).toBeNull();
      // Falls back to system (light)
      expect(result.current.colorScheme).toBe('light');
    });
  });
});
