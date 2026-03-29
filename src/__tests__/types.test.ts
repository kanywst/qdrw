import { STROKE_WIDTH_PX } from '../types';

describe('STROKE_WIDTH_PX', () => {
  it('has at least 3 distinct width keys defined', () => {
    const keys = Object.keys(STROKE_WIDTH_PX);
    expect(keys.length).toBeGreaterThanOrEqual(3);
  });

  it('maps S, M, L keys to positive numbers', () => {
    for (const key of ['S', 'M', 'L'] as const) {
      expect(STROKE_WIDTH_PX[key]).toBeGreaterThan(0);
    }
  });

  it('all three values are distinct', () => {
    const values = [STROKE_WIDTH_PX.S, STROKE_WIDTH_PX.M, STROKE_WIDTH_PX.L];
    const unique = new Set(values);
    expect(unique.size).toBe(values.length);
  });
});

// **Validates: Requirements 2.3, 2.4**
import fc from 'fast-check';
import { COLOR_SCHEME_CONFIG } from '../types';
import type { ColorScheme } from '../types';

describe('Property 2: ColorScheme config mapping', () => {
  it('for any ColorScheme, config has background, stroke, toolbar, accent fields', () => {
    fc.assert(
      fc.property(fc.constantFrom('light' as ColorScheme, 'dark' as ColorScheme), (scheme) => {
        const config = COLOR_SCHEME_CONFIG[scheme];
        expect(config.background).toBeTruthy();
        expect(config.stroke).toBeTruthy();
        expect(config.toolbar).toBeTruthy();
        expect(config.accent).toBeTruthy();
      })
    );
  });

  it('dark mode has dark background and light stroke', () => {
    const dark = COLOR_SCHEME_CONFIG['dark'];
    // oklch(10% 0 0) is very dark
    expect(dark.background).toBe('oklch(10% 0 0)');
    expect(dark.stroke).toBe('oklch(95% 0 0)');
  });

  it('light mode has light background and dark stroke', () => {
    const light = COLOR_SCHEME_CONFIG['light'];
    expect(light.background).toBe('oklch(98% 0 0)');
    expect(light.stroke).toBe('oklch(12% 0 0)');
  });
});
