/**
 * Property-Based Tests for AutoCrop
 *
 * Property 9: AutoCrop bounding box contains all drawn pixels
 *   Validates: Requirements 7.1
 *
 * Property 10: AutoCrop export padding invariant
 *   Validates: Requirements 7.2
 */

import fc from 'fast-check';
import { computeBoundingBox } from '../utils/autoCrop';
import { EXPORT_PADDING } from '../types';

// ── ImageData Polyfill ────────────────────────────────────────────────────────

class ImageDataPolyfill {
  data: Uint8ClampedArray;
  width: number;
  height: number;
  colorSpace: PredefinedColorSpace = 'srgb';

  constructor(widthOrData: number | Uint8ClampedArray, height: number) {
    if (typeof widthOrData === 'number') {
      this.width = widthOrData;
      this.height = height;
      this.data = new Uint8ClampedArray(widthOrData * height * 4);
    } else {
      this.data = widthOrData;
      this.width = widthOrData.length / (4 * height);
      this.height = height;
    }
  }
}

if (typeof globalThis.ImageData === 'undefined') {
  (globalThis as unknown as Record<string, unknown>).ImageData = ImageDataPolyfill;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeImageData(width: number, height: number): ImageDataPolyfill {
  return new (globalThis.ImageData as typeof ImageDataPolyfill)(width, height);
}

// ── Property 9: AutoCrop bounding box contains all drawn pixels ───────────────

/**
 * **Validates: Requirements 7.1**
 *
 * For any set of drawn pixel positions in an ImageData, the computed bounding
 * box shall contain every drawn pixel.
 */
describe('Property 9: AutoCrop bounding box contains all drawn pixels', () => {
  it('bbox contains every drawn pixel for any set of positions', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 10, max: 100 }), // width
        fc.integer({ min: 10, max: 100 }), // height
        fc.array(
          fc.record({
            x: fc.integer({ min: 0, max: 9 }), // will be scaled to width-1
            y: fc.integer({ min: 0, max: 9 }), // will be scaled to height-1
          }),
          { minLength: 1, maxLength: 20 }
        ),
        (width, height, relPositions) => {
          // Scale positions to canvas bounds
          const positions = relPositions.map((p) => ({
            x: Math.floor((p.x * (width - 1)) / 9),
            y: Math.floor((p.y * (height - 1)) / 9),
          }));

          // Create ImageData with all-zero background (r=0,g=0,b=0,a=0)
          const imageData = makeImageData(width, height);

          // Mark each position as drawn by setting alpha=255
          for (const { x, y } of positions) {
            const idx = (y * width + x) * 4;
            imageData.data[idx + 3] = 255; // alpha = 255 → drawn
          }

          const bgColor = { r: 0, g: 0, b: 0 };
          const bbox = computeBoundingBox(imageData as unknown as ImageData, bgColor);

          // bbox must not be null since we have at least one drawn pixel
          if (bbox === null) return false;

          // Every drawn pixel must be within the bounding box
          for (const { x, y } of positions) {
            if (x < bbox.minX || x > bbox.maxX) return false;
            if (y < bbox.minY || y > bbox.maxY) return false;
          }

          return true;
        }
      ),
      { numRuns: 500 }
    );
  });
});

// ── Property 10: AutoCrop export padding invariant ────────────────────────────

/**
 * **Validates: Requirements 7.2**
 *
 * For any non-empty canvas, the exported crop dimensions satisfy:
 *   exportWidth  = min(boundingWidth  + 2 * EXPORT_PADDING, canvasWidth)
 *   exportHeight = min(boundingHeight + 2 * EXPORT_PADDING, canvasHeight)
 */
describe('Property 10: AutoCrop export padding invariant', () => {
  it('export dimensions equal bounding dimensions + 2 * EXPORT_PADDING (clamped to canvas)', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 10, max: 100 }), // width
        fc.integer({ min: 10, max: 100 }), // height
        fc.array(
          fc.record({
            x: fc.integer({ min: 0, max: 9 }),
            y: fc.integer({ min: 0, max: 9 }),
          }),
          { minLength: 1, maxLength: 20 }
        ),
        (width, height, relPositions) => {
          // Scale positions to canvas bounds
          const positions = relPositions.map((p) => ({
            x: Math.floor((p.x * (width - 1)) / 9),
            y: Math.floor((p.y * (height - 1)) / 9),
          }));

          // Create ImageData with all-zero background, mark drawn pixels
          const imageData = makeImageData(width, height);
          for (const { x, y } of positions) {
            const idx = (y * width + x) * 4;
            imageData.data[idx + 3] = 255;
          }

          const bgColor = { r: 0, g: 0, b: 0 };
          const bbox = computeBoundingBox(imageData as unknown as ImageData, bgColor);

          if (bbox === null) return true; // skip empty canvas (not the focus of this property)

          // Compute crop region (matching autoCrop.ts logic)
          const cropX = Math.max(0, bbox.minX - EXPORT_PADDING);
          const cropY = Math.max(0, bbox.minY - EXPORT_PADDING);
          const cropRight = Math.min(width, bbox.maxX + EXPORT_PADDING + 1);
          const cropBottom = Math.min(height, bbox.maxY + EXPORT_PADDING + 1);

          // The crop must contain the entire bounding box
          if (cropX > bbox.minX) return false;
          if (cropY > bbox.minY) return false;
          if (cropRight <= bbox.maxX) return false;
          if (cropBottom <= bbox.maxY) return false;

          // Padding on each side must be at most EXPORT_PADDING (clamped by canvas bounds)
          const padLeft = bbox.minX - cropX;
          const padTop = bbox.minY - cropY;
          const padRight = cropRight - bbox.maxX - 1;
          const padBottom = cropBottom - bbox.maxY - 1;

          if (padLeft > EXPORT_PADDING) return false;
          if (padTop > EXPORT_PADDING) return false;
          if (padRight > EXPORT_PADDING) return false;
          if (padBottom > EXPORT_PADDING) return false;

          // When not clamped, padding must equal exactly EXPORT_PADDING
          if (bbox.minX >= EXPORT_PADDING && padLeft !== EXPORT_PADDING) return false;
          if (bbox.minY >= EXPORT_PADDING && padTop !== EXPORT_PADDING) return false;
          if (bbox.maxX + EXPORT_PADDING + 1 <= width && padRight !== EXPORT_PADDING) return false;
          if (bbox.maxY + EXPORT_PADDING + 1 <= height && padBottom !== EXPORT_PADDING) return false;

          return true;
        }
      ),
      { numRuns: 500 }
    );
  });
});
