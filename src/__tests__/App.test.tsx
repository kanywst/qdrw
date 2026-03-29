/**
 * Unit Tests for App keyboard shortcuts
 * Validates: Requirements 3.1–3.6
 */

import { render, fireEvent, act, cleanup } from '@testing-library/react';
import App from '../App';

// ---- Global mocks ----

beforeAll(() => {
  // matchMedia (required by useColorScheme)
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

  // navigator.clipboard
  Object.defineProperty(navigator, 'clipboard', {
    writable: true,
    configurable: true,
    value: {
      write: vi.fn().mockResolvedValue(undefined),
      writeText: vi.fn().mockResolvedValue(undefined),
    },
  });

  // ClipboardItem (not available in jsdom)
  if (!('ClipboardItem' in globalThis)) {
    Object.defineProperty(globalThis, 'ClipboardItem', {
      writable: true,
      configurable: true,
      value: class ClipboardItem {
        data: Record<string, Blob>;
        constructor(data: Record<string, Blob>) {
          this.data = data;
        }
      },
    });
  }

  // window.URL
  Object.defineProperty(window.URL, 'createObjectURL', {
    writable: true,
    configurable: true,
    value: vi.fn().mockReturnValue('blob:mock'),
  });
  Object.defineProperty(window.URL, 'revokeObjectURL', {
    writable: true,
    configurable: true,
    value: vi.fn(),
  });

  // OffscreenCanvas (used by autoCrop)
  if (!('OffscreenCanvas' in globalThis)) {
    class MockOffscreenCanvas {
      width: number;
      height: number;
      constructor(w: number, h: number) {
        this.width = w;
        this.height = h;
      }
      getContext() {
        return {
          drawImage: vi.fn(),
          getImageData: vi.fn().mockReturnValue({
            data: new Uint8ClampedArray(4), // all zeros → empty canvas
            width: 1,
            height: 1,
          }),
          fillRect: vi.fn(),
          clearRect: vi.fn(),
          beginPath: vi.fn(),
          fill: vi.fn(),
          stroke: vi.fn(),
          save: vi.fn(),
          restore: vi.fn(),
          scale: vi.fn(),
          translate: vi.fn(),
          moveTo: vi.fn(),
          lineTo: vi.fn(),
          arc: vi.fn(),
          closePath: vi.fn(),
          canvas: { width: 1, height: 1 },
        };
      }
      convertToBlob() {
        return Promise.resolve(new Blob([], { type: 'image/png' }));
      }
    }
    Object.defineProperty(globalThis, 'OffscreenCanvas', {
      writable: true,
      configurable: true,
      value: MockOffscreenCanvas,
    });
  }

  // HTMLCanvasElement.getContext (jsdom stub)
  HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({
    drawImage: vi.fn(),
    getImageData: vi.fn().mockReturnValue({
      data: new Uint8ClampedArray(4),
      width: 1,
      height: 1,
    }),
    fillRect: vi.fn(),
    clearRect: vi.fn(),
    beginPath: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    scale: vi.fn(),
    translate: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    arc: vi.fn(),
    closePath: vi.fn(),
    canvas: { width: 1, height: 1 },
  }) as unknown as typeof HTMLCanvasElement.prototype.getContext;
});

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
});

afterEach(() => {
  cleanup();
});

// ---- Tests ----

describe('Keyboard shortcuts', () => {
  it('B key sets tool to brush (Requirements 3.1)', async () => {
    const { getByLabelText } = render(<App />);

    // First switch to eraser so we can verify B switches back
    await act(async () => {
      fireEvent.keyDown(window, { key: 'E' });
    });
    expect(getByLabelText('Eraser tool')).toHaveAttribute('aria-pressed', 'true');

    // Now press B
    await act(async () => {
      fireEvent.keyDown(window, { key: 'B' });
    });
    expect(getByLabelText('Brush tool')).toHaveAttribute('aria-pressed', 'true');
  });

  it('E key sets tool to eraser (Requirements 3.2)', async () => {
    const { getByLabelText } = render(<App />);

    await act(async () => {
      fireEvent.keyDown(window, { key: 'E' });
    });
    expect(getByLabelText('Eraser tool')).toHaveAttribute('aria-pressed', 'true');
    expect(getByLabelText('Brush tool')).toHaveAttribute('aria-pressed', 'false');
  });

  it('Z key fires undo without crashing (Requirements 3.3)', async () => {
    const { getByLabelText } = render(<App />);

    // Undo on empty history should be a no-op (no crash)
    await act(async () => {
      fireEvent.keyDown(window, { key: 'Z' });
    });

    // App still renders correctly after undo on empty state
    expect(getByLabelText('Brush tool')).toBeInTheDocument();
  });

  it('C key calls clipboard.write (Requirements 3.4)', async () => {
    render(<App />);

    await act(async () => {
      fireEvent.keyDown(window, { key: 'C' });
    });

    // clipboard.write should have been called (autoCrop path)
    expect(navigator.clipboard.write).toHaveBeenCalled();
  });

  it('Shift+C key calls window.confirm (Requirements 3.5)', async () => {
    window.confirm = vi.fn().mockReturnValue(false);
    render(<App />);

    await act(async () => {
      fireEvent.keyDown(window, { key: 'C', shiftKey: true });
    });

    expect(window.confirm).toHaveBeenCalled();
  });

  it('Shift+C clears canvas when confirmed (Requirements 3.5, 3.6)', async () => {
    window.confirm = vi.fn().mockReturnValue(true);
    const { getByLabelText } = render(<App />);

    await act(async () => {
      fireEvent.keyDown(window, { key: 'C', shiftKey: true });
    });

    expect(window.confirm).toHaveBeenCalled();
    // App still renders correctly after clear
    expect(getByLabelText('Brush tool')).toBeInTheDocument();
  });
});
