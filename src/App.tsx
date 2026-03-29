import { useCallback, useEffect, useRef, useState } from 'react';
import { useColorScheme } from './hooks/useColorScheme';
import { useDrawing } from './hooks/useDrawing';
import { DrawingCanvas } from './components/DrawingCanvas';
import { Toolbar } from './components/Toolbar';
import { Toast } from './components/Toast';
import { Splash } from './components/Splash';
import { COLOR_SCHEME_CONFIG } from './types';
import { downloadPng } from './utils/autoCrop';
import { AnimatePresence } from 'motion/react';

function App(): React.ReactElement {
  const { colorScheme } = useColorScheme();
  const { strokes, currentStroke, activeTool, strokeWidth, isDrawing, dispatch, handleCopy, handleClear } = useDrawing();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [showSplash, setShowSplash] = useState(true);

  // Apply CSS custom properties when colorScheme changes
  useEffect(() => {
    const config = COLOR_SCHEME_CONFIG[colorScheme];
    const root = document.documentElement;
    root.style.setProperty('--color-canvas-bg', config.background);
    root.style.setProperty('--color-stroke', config.stroke);
    root.style.setProperty('--color-toolbar-bg', config.toolbar);
    root.style.setProperty('--color-toolbar-icon', colorScheme === 'dark' ? 'oklch(55% 0 0)' : 'oklch(65% 0 0)');
    root.style.setProperty('--color-active-icon', colorScheme === 'dark' ? 'oklch(95% 0 0)' : 'oklch(12% 0 0)');
    root.style.setProperty('--color-active-bg', colorScheme === 'dark' ? 'oklch(95% 0 0 / 0.12)' : 'oklch(12% 0 0 / 0.10)');
    root.style.setProperty('--color-accent', config.accent);
    root.style.backgroundColor = config.background;
  }, [colorScheme]);

  // Toast state
  const [toast, setToast] = useState<{ message: string; visible: boolean }>({ message: '', visible: false });
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((message: string) => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToast({ message, visible: true });
    toastTimeoutRef.current = setTimeout(() => {
      setToast((prev) => ({ ...prev, visible: false }));
    }, 2000);
  }, []);

  const handleClearWithConfirm = useCallback(() => {
    if (window.confirm('Clear the canvas?')) {
      handleClear();
      showToast('CLEARED');
    }
  }, [handleClear, showToast]);

  const handleCopyWithToast = useCallback(async () => {
    try {
      await handleCopy(canvasRef, colorScheme);
      showToast('COPIED ✓');
    } catch {
      // Clipboard API failed — fall back to download
      await downloadPng(canvasRef, colorScheme);
      showToast('SAVED ↓');
    }
  }, [handleCopy, canvasRef, colorScheme, showToast]);

  const handleDownloadWithToast = useCallback(async () => {
    await downloadPng(canvasRef, colorScheme);
    showToast('SAVED ↓');
  }, [canvasRef, colorScheme, showToast]);

  useEffect(() => {
    if (showSplash) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept when typing in inputs
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      const isMac = navigator.platform.toUpperCase().includes('MAC');
      const isCtrlOrCmd = isMac ? e.metaKey : e.ctrlKey;

      switch (e.key) {
        case 'b':
        case 'B':
          dispatch({ type: 'SET_TOOL', tool: 'brush' });
          showToast('BRUSH');
          break;
        case 'e':
        case 'E':
          dispatch({ type: 'SET_TOOL', tool: 'eraser' });
          showToast('ERASER');
          break;
        case 'z':
        case 'Z':
          if (!e.shiftKey) {
            dispatch({ type: 'UNDO' });
            showToast('UNDO');
          }
          break;
        case 's':
        case 'S':
          if (!isCtrlOrCmd) {
            e.preventDefault();
            handleDownloadWithToast();
          }
          break;
        case '[':
          dispatch({ type: 'SET_WIDTH', width: strokeWidth === 'L' ? 'M' : 'S' });
          showToast('THINNER');
          break;
        case ']':
          dispatch({ type: 'SET_WIDTH', width: strokeWidth === 'S' ? 'M' : 'L' });
          showToast('THICKER');
          break;
        case 'c':
        case 'C':
          if (e.shiftKey) {
            // Shift+C = clear
            handleClearWithConfirm();
          } else if (!isCtrlOrCmd || window.getSelection()?.toString() === '') {
            // C or Cmd/Ctrl+C when no text selected = copy
            e.preventDefault();
            handleCopyWithToast();
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [dispatch, strokeWidth, handleClearWithConfirm, handleCopyWithToast, handleDownloadWithToast, showToast, showSplash]);

  return (
    <div style={{ width: '100vw', height: '100vh', overflow: 'hidden', background: COLOR_SCHEME_CONFIG[colorScheme].background }}>
      <AnimatePresence>
        {showSplash && (
          <Splash
            colorScheme={colorScheme}
            onEnter={() => setShowSplash(false)}
          />
        )}
      </AnimatePresence>
      <DrawingCanvas
        strokes={strokes}
        currentStroke={currentStroke}
        activeTool={activeTool}
        strokeWidth={strokeWidth}
        colorScheme={colorScheme}
        onStrokeStart={(p) => dispatch({ type: 'STROKE_START', point: p })}
        onStrokeMove={(p) => dispatch({ type: 'STROKE_MOVE', point: p })}
        onStrokeEnd={() => dispatch({ type: 'STROKE_END' })}
        canvasRef={canvasRef}
      />
      <Toolbar
        activeTool={activeTool}
        strokeWidth={strokeWidth}
        isDrawing={isDrawing}
        colorScheme={colorScheme}
        onToolChange={(tool) => dispatch({ type: 'SET_TOOL', tool })}
        onWidthChange={(width) => dispatch({ type: 'SET_WIDTH', width })}
        onCopy={handleCopyWithToast}
        onDownload={handleDownloadWithToast}
        onClear={handleClearWithConfirm}
      />
      <Toast message={toast.message} visible={toast.visible} />
    </div>
  );
}

export default App;
