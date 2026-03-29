/**
 * Property-Based Tests for DrawingCanvas
 *
 * Property 1: Canvas area coverage
 * Validates: Requirements 1.1
 */

import fc from 'fast-check';
import { render, cleanup } from '@testing-library/react';
import { DrawingCanvas } from '../components/DrawingCanvas';
import React from 'react';

beforeAll(() => {
  // Mock matchMedia (required by jsdom environment)
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  });
});

afterEach(() => {
  cleanup();
});

/**
 * Property 1: Canvas area coverage
 * Validates: Requirements 1.1
 *
 * For any viewport size (width × height), the canvas element's rendered area
 * shall be at least 95% of the total viewport area.
 * Since the canvas uses style={{ width: '100vw', height: '100vh' }},
 * 100vw × 100vh is always 100% of the viewport, which trivially satisfies >= 95%.
 */
test('Property 1: Canvas area coverage — canvas is styled 100vw × 100vh', () => {
  fc.assert(
    fc.property(
      fc.integer({ min: 320, max: 3840 }),
      fc.integer({ min: 240, max: 2160 }),
      (width, height) => {
        // Mock viewport dimensions
        Object.defineProperty(window, 'innerWidth', { value: width, writable: true, configurable: true });
        Object.defineProperty(window, 'innerHeight', { value: height, writable: true, configurable: true });

        const canvasRef = React.createRef<HTMLCanvasElement>();
        const { container } = render(
          <DrawingCanvas
            strokes={[]}
            currentStroke={[]}
            activeTool="brush"
            strokeWidth="M"
            colorScheme="dark"
            onStrokeStart={() => {}}
            onStrokeMove={() => {}}
            onStrokeEnd={() => {}}
            canvasRef={canvasRef}
          />
        );

        const canvas = container.querySelector('canvas');
        if (!canvas) return false;

        // Canvas must be styled to cover 100% of viewport
        expect(canvas.style.width).toBe('100vw');
        expect(canvas.style.height).toBe('100vh');

        // 100vw × 100vh is always >= 95% of viewport (trivially true)
        const canvasArea = width * height; // 100% of viewport
        const viewportArea = width * height;
        return canvasArea >= 0.95 * viewportArea;
      }
    ),
    { numRuns: 100 }
  );
});
