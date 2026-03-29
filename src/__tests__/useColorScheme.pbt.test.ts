/**
 * Property-Based Tests for useColorScheme
 *
 * Property 3: ColorScheme override round-trip
 * Validates: Requirements 2.5
 */

import fc from 'fast-check';
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
  };
  window.matchMedia = vi.fn().mockReturnValue(mq);
  return mq;
}

beforeEach(() => {
  localStorage.removeItem('colorScheme');
  vi.restoreAllMocks();
});

test('Property 3: ColorScheme override round-trip', () => {
  /**
   * Validates: Requirements 2.5
   *
   * For any ColorScheme value passed to setOverride:
   * 1. localStorage.getItem('colorScheme') returns the same value
   * 2. The active colorScheme equals the override value (not the system setting)
   */
  fc.assert(
    fc.property(
      fc.constantFrom('light' as const, 'dark' as const),
      fc.boolean(), // system dark?
      (scheme, systemDark) => {
        mockMatchMedia(systemDark);
        const { result } = renderHook(() => useColorScheme());
        act(() => {
          result.current.setOverride(scheme);
        });
        expect(localStorage.getItem('colorScheme')).toBe(scheme);
        expect(result.current.colorScheme).toBe(scheme);
        expect(result.current.override).toBe(scheme);
        // cleanup
        act(() => {
          result.current.setOverride(null);
        });
      }
    ),
    { numRuns: 100 }
  );
});
