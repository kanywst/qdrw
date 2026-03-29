import { vi, describe, it, expect, beforeEach } from 'vitest';
import type React from 'react';

// ── Polyfills (jsdom doesn't provide these) ──────────────────────────────────

// ImageData polyfill
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
// Only polyfill if not already defined
if (typeof globalThis.ImageData === 'undefined') {
  (globalThis as unknown as Record<string, unknown>).ImageData = ImageDataPolyfill;
}

// ClipboardItem polyfill
if (typeof globalThis.ClipboardItem === 'undefined') {
  class ClipboardItemPolyfill {
    private _items: Record<string, Blob | Promise<Blob>>;
    types: string[];

    constructor(items: Record<string, Blob | Promise<Blob>>) {
      this._items = items;
      this.types = Object.keys(items);
    }

    async getType(type: string): Promise<Blob> {
      const item = this._items[type];
      return item instanceof Promise ? item : Promise.resolve(item);
    }
  }
  (globalThis as unknown as Record<string, unknown>).ClipboardItem = ClipboardItemPolyfill;
}

// ── MockOffscreenCanvas ───────────────────────────────────────────────────────

class MockOffscreenCanvas {
  width: number;
  height: number;
  protected _getImageData: () => ImageDataPolyfill;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this._getImageData = () => new (globalThis.ImageData as typeof ImageDataPolyfill)(width, height);
  }

  getContext(_: string) {
    return {
      drawImage: vi.fn(),
      getImageData: vi.fn(() => this._getImageData()),
    };
  }

  convertToBlob(_opts?: unknown): Promise<Blob> {
    return Promise.resolve(new Blob(['fake-png'], { type: 'image/png' }));
  }
}

vi.stubGlobal('OffscreenCanvas', MockOffscreenCanvas);

// ── navigator.clipboard mock ──────────────────────────────────────────────────

const mockClipboardWrite = vi.fn().mockResolvedValue(undefined);
Object.defineProperty(navigator, 'clipboard', {
  value: { write: mockClipboardWrite },
  writable: true,
  configurable: true,
});

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeEmptyImageData(width: number, height: number): ImageData {
  return new (globalThis.ImageData as typeof ImageDataPolyfill)(width, height) as unknown as ImageData;
}

// Create ImageData filled with a specific background color (all pixels = bgColor, a=255)
function makeBackgroundImageData(width: number, height: number, r: number, g: number, b: number): ImageData {
  const img = new (globalThis.ImageData as typeof ImageDataPolyfill)(width, height);
  for (let i = 0; i < img.data.length; i += 4) {
    img.data[i] = r;
    img.data[i + 1] = g;
    img.data[i + 2] = b;
    img.data[i + 3] = 255;
  }
  return img as unknown as ImageData;
}

function makeDrawnImageData(width: number, height: number): ImageData {
  // Fill with light-mode background (r=250,g=250,b=250,a=255), then mark pixel (10,10) as drawn
  const img = makeBackgroundImageData(width, height, 250, 250, 250) as unknown as ImageDataPolyfill;
  const idx = (10 * width + 10) * 4;
  img.data[idx] = 0;       // R — differs from bg by 250
  img.data[idx + 1] = 0;   // G
  img.data[idx + 2] = 0;   // B
  img.data[idx + 3] = 255; // A
  return img as unknown as ImageData;
}

function makeMockCanvasRef(width = 100, height = 100) {
  const canvas = { width, height, getContext: vi.fn() } as unknown as HTMLCanvasElement;
  return { current: canvas };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

// Import after polyfills are set up
import { autoCrop, computeBoundingBox } from '../utils/autoCrop';

describe('computeBoundingBox', () => {
  it('returns null for all-background pixels (edge-case 7.3)', () => {
    // All-zero ImageData: r=0,g=0,b=0,a=0 for every pixel.
    // bgColor={r:0,g:0,b:0}: no channel differs by >10, and a=0 is not >10 → null.
    const imageData = makeEmptyImageData(50, 50);
    const bgColor = { r: 0, g: 0, b: 0 };
    const result = computeBoundingBox(imageData, bgColor);
    expect(result).toBeNull();
  });

  it('returns bounding box when drawn pixels exist', () => {
    // All-zero background; pixel (10,10) has a=255 which is >10 → drawn.
    const imageData = makeEmptyImageData(50, 50);
    const idx = (10 * 50 + 10) * 4;
    (imageData as unknown as ImageDataPolyfill).data[idx + 3] = 255; // set alpha
    const bgColor = { r: 0, g: 0, b: 0 };
    const result = computeBoundingBox(imageData, bgColor);
    expect(result).not.toBeNull();
    expect(result!.minX).toBe(10);
    expect(result!.minY).toBe(10);
    expect(result!.maxX).toBe(10);
    expect(result!.maxY).toBe(10);
  });
});

describe('autoCrop', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockClipboardWrite.mockResolvedValue(undefined);
  });

  it('calls clipboard.write with full canvas blob when canvas is empty (7.3)', async () => {
    // OffscreenCanvas returns ImageData filled with light-mode background color
    // so computeBoundingBox returns null → full canvas is exported
    vi.stubGlobal('OffscreenCanvas', class extends MockOffscreenCanvas {
      constructor(w: number, h: number) {
        super(w, h);
        this._getImageData = () => makeBackgroundImageData(w, h, 250, 250, 250);
      }
    });

    const canvasRef = makeMockCanvasRef(100, 100);
    await autoCrop(canvasRef as React.RefObject<HTMLCanvasElement | null>, 'light');

    expect(mockClipboardWrite).toHaveBeenCalledOnce();
    const [items] = mockClipboardWrite.mock.calls[0];
    expect(items).toHaveLength(1);
    expect(items[0]).toBeInstanceOf(globalThis.ClipboardItem as unknown as typeof ClipboardItem);
  });

  it('calls triggerDownload when clipboard.write throws (7.6)', async () => {
    mockClipboardWrite.mockRejectedValue(new Error('Permission denied'));

    vi.stubGlobal('OffscreenCanvas', class extends MockOffscreenCanvas {
      constructor(w: number, h: number) {
        super(w, h);
        this._getImageData = () => makeDrawnImageData(w, h);
      }
    });

    // Mock URL.createObjectURL / revokeObjectURL
    vi.stubGlobal('URL', {
      createObjectURL: vi.fn().mockReturnValue('blob:mock-url'),
      revokeObjectURL: vi.fn(),
    });

    // Capture anchor click via document.createElement spy
    const clickSpy = vi.fn();
    const mockAnchor = { href: '', download: '', click: clickSpy };
    vi.spyOn(document, 'createElement').mockReturnValue(mockAnchor as unknown as HTMLElement);

    const canvasRef = makeMockCanvasRef(100, 100);
    await autoCrop(canvasRef as React.RefObject<HTMLCanvasElement | null>, 'light');

    expect(mockClipboardWrite).toHaveBeenCalledOnce();
    expect(clickSpy).toHaveBeenCalledOnce();
    expect(mockAnchor.download).toBe('qdrw-export.png');
  });

  it('passes PNG Blob to clipboard.write on success (7.5)', async () => {
    vi.stubGlobal('OffscreenCanvas', class extends MockOffscreenCanvas {
      constructor(w: number, h: number) {
        super(w, h);
        this._getImageData = () => makeDrawnImageData(w, h);
      }
    });

    const canvasRef = makeMockCanvasRef(100, 100);
    await autoCrop(canvasRef as React.RefObject<HTMLCanvasElement | null>, 'light');

    expect(mockClipboardWrite).toHaveBeenCalledOnce();
    const [items] = mockClipboardWrite.mock.calls[0];
    expect(items).toHaveLength(1);
    const item = items[0];
    expect(item).toBeInstanceOf(globalThis.ClipboardItem as unknown as typeof ClipboardItem);
    expect(item.types).toContain('image/png');
  });
});
