import type React from 'react';
import { COLOR_SCHEME_CONFIG, EXPORT_PADDING } from '../types';
import type { ColorScheme } from '../types';

/**
 * Compute the bounding box of all "drawn" pixels in the given ImageData.
 * A pixel is considered drawn if it differs from bgColor by more than a threshold
 * (alpha > 10 OR any RGB channel differs by > 10).
 *
 * Returns null if no drawn pixels are found (empty canvas).
 */
export function computeBoundingBox(
  imageData: ImageData,
  bgColor: { r: number; g: number; b: number }
): { minX: number; minY: number; maxX: number; maxY: number } | null {
  const { data, width, height } = imageData;
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      const a = data[idx + 3];

      const isDrawn =
        a > 10 ||
        Math.abs(r - bgColor.r) > 10 ||
        Math.abs(g - bgColor.g) > 10 ||
        Math.abs(b - bgColor.b) > 10;

      if (isDrawn) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (maxX === -1) {
    return null;
  }

  return { minX, minY, maxX, maxY };
}

/**
 * Trigger a file download of the given Blob with the specified filename.
 * Exported for testing purposes.
 */
export function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Parse the background color from a COLOR_SCHEME_CONFIG background string.
 * Supports the two known oklch values used in the app.
 */
function parseBgColor(colorScheme: ColorScheme): { r: number; g: number; b: number } {
  const bg = COLOR_SCHEME_CONFIG[colorScheme].background;
  // 'oklch(10% 0 0)' → dark mode ≈ rgb(20, 20, 20)
  // 'oklch(98% 0 0)' → light mode ≈ rgb(250, 250, 250)
  if (bg.includes('10%')) {
    return { r: 20, g: 20, b: 20 };
  }
  return { r: 250, g: 250, b: 250 };
}

/**
 * AutoCrop: reads the canvas, computes the bounding box of drawn pixels,
 * crops with EXPORT_PADDING, and writes the result to the Clipboard as PNG.
 * Falls back to a file download if the Clipboard API is unavailable.
 */
export async function autoCrop(
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  colorScheme: ColorScheme
): Promise<void> {
  const canvas = canvasRef.current;
  if (!canvas) return;

  const { width, height } = canvas;

  // Draw canvas onto an OffscreenCanvas to read pixel data
  const offscreen = new OffscreenCanvas(width, height);
  const ctx = offscreen.getContext('2d');
  if (!ctx) return;

  ctx.drawImage(canvas, 0, 0);
  const imageData = ctx.getImageData(0, 0, width, height);

  const bgColor = parseBgColor(colorScheme);
  const bbox = computeBoundingBox(imageData, bgColor);

  let blob: Blob;

  if (bbox === null) {
    // Empty canvas — export full canvas
    blob = await offscreen.convertToBlob({ type: 'image/png' });
  } else {
    // Crop with padding, clamped to canvas bounds
    const cropX = Math.max(0, bbox.minX - EXPORT_PADDING);
    const cropY = Math.max(0, bbox.minY - EXPORT_PADDING);
    const cropRight = Math.min(width, bbox.maxX + EXPORT_PADDING + 1);
    const cropBottom = Math.min(height, bbox.maxY + EXPORT_PADDING + 1);
    const cropW = cropRight - cropX;
    const cropH = cropBottom - cropY;

    const croppedCanvas = new OffscreenCanvas(cropW, cropH);
    const croppedCtx = croppedCanvas.getContext('2d');
    if (!croppedCtx) return;

    croppedCtx.drawImage(offscreen, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);
    blob = await croppedCanvas.convertToBlob({ type: 'image/png' });
  }

  // Try Clipboard API first
  try {
    await navigator.clipboard.write([
      new ClipboardItem({ 'image/png': blob }),
    ]);
  } catch (err) {
    // Clipboard API unavailable or permission denied — fall back to download
    console.warn('Clipboard API unavailable, falling back to file download:', err);
    triggerDownload(blob, 'qdrw-export.png');
  }
}
