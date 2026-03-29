import React, { useEffect, useCallback } from 'react';
import { getStroke } from 'perfect-freehand';
import type { Stroke, Point, ActiveTool, StrokeWidth, ColorScheme } from '../types';
import { STROKE_WIDTH_PX } from '../types';

interface DrawingCanvasProps {
  strokes: Stroke[];
  currentStroke: Point[];
  activeTool: ActiveTool;
  strokeWidth: StrokeWidth;
  colorScheme: ColorScheme;
  onStrokeStart: (point: Point) => void;
  onStrokeMove: (point: Point) => void;
  onStrokeEnd: () => void;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
}

function getSvgPathFromStroke(points: number[][]): string {
  if (points.length < 2) return '';
  const d: string[] = [];
  const [first, second] = points;
  d.push(`M ${first[0]} ${first[1]}`);
  d.push(`Q ${first[0]} ${first[1]} ${(first[0] + second[0]) / 2} ${(first[1] + second[1]) / 2}`);
  for (let i = 1; i < points.length - 1; i++) {
    const curr = points[i];
    const next = points[i + 1];
    d.push(`Q ${curr[0]} ${curr[1]} ${(curr[0] + next[0]) / 2} ${(curr[1] + next[1]) / 2}`);
  }
  d.push('Z');
  return d.join(' ');
}

const STROKE_COLOR: Record<ColorScheme, string> = {
  dark: '#ffffff',
  light: '#111111',
};

const BACKGROUND_COLOR: Record<ColorScheme, string> = {
  dark: '#141414',
  light: '#fafafa',
};

function drawStroke(
  ctx: CanvasRenderingContext2D,
  stroke: Stroke | { points: Point[]; tool: ActiveTool; width: StrokeWidth; color: string },
  colorScheme: ColorScheme
): void {
  if (stroke.points.length === 0) return;

  const outlinePoints = getStroke(
    stroke.points.map((p) => [p.x, p.y, p.pressure]),
    {
      size: STROKE_WIDTH_PX[stroke.width],
      thinning: 0.15,
      smoothing: 0.6,
      streamline: 0.4,
      simulatePressure: false,
    }
  );

  if (outlinePoints.length === 0) return;
  const pathStr = getSvgPathFromStroke(outlinePoints);
  if (!pathStr) return;

  const path = new Path2D(pathStr);

  if (stroke.tool === 'eraser') {
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillStyle = 'rgba(0,0,0,1)';
  } else {
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = STROKE_COLOR[colorScheme];
  }

  ctx.fill(path);
  ctx.globalCompositeOperation = 'source-over';
}

export function DrawingCanvas({
  strokes,
  currentStroke,
  activeTool,
  strokeWidth,
  colorScheme,
  onStrokeStart,
  onStrokeMove,
  onStrokeEnd,
  canvasRef,
}: DrawingCanvasProps): React.ReactElement {
  const isDrawingRef = React.useRef(false);

  // Set canvas pixel size = CSS size (no DPR scaling).
  // This guarantees e.clientX/Y maps 1:1 to canvas coordinates with no offset.
  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }, [canvasRef]);

  useEffect(() => {
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    return () => window.removeEventListener('resize', resizeCanvas);
  }, [resizeCanvas]);

  // Custom cursor
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const size = STROKE_WIDTH_PX[strokeWidth];
    const accent = colorScheme === 'dark' ? '#7dd3fc' : '#2563eb';

    if (activeTool === 'brush') {
      const r = Math.max(size / 2 + 2, 5);
      const pad = 8;
      const svgSize = (r + pad) * 2;
      const cx = svgSize / 2;
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${svgSize}" height="${svgSize}">
        <circle cx="${cx}" cy="${cx}" r="${r + 5}" fill="${accent}" opacity="0.15"/>
        <circle cx="${cx}" cy="${cx}" r="${r}" fill="${accent}" opacity="0.95"/>
      </svg>`;
      canvas.style.cursor = `url("data:image/svg+xml,${encodeURIComponent(svg)}") ${cx} ${cx}, crosshair`;
    } else {
      const er = size * 2 + 4;
      const pad = 6;
      const svgSize = (er + pad) * 2;
      const cx = svgSize / 2;
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${svgSize}" height="${svgSize}">
        <circle cx="${cx}" cy="${cx}" r="${er}" fill="none" stroke="${accent}" stroke-width="2" stroke-dasharray="5 3" opacity="0.9"/>
        <circle cx="${cx}" cy="${cx}" r="2.5" fill="${accent}" opacity="0.95"/>
      </svg>`;
      canvas.style.cursor = `url("data:image/svg+xml,${encodeURIComponent(svg)}") ${cx} ${cx}, crosshair`;
    }
  }, [activeTool, strokeWidth, colorScheme, canvasRef]);

  // Redraw — no transform needed, canvas coords = CSS pixel coords
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rafId = requestAnimationFrame(() => {
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = BACKGROUND_COLOR[colorScheme];
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      for (const stroke of strokes) {
        drawStroke(ctx, stroke, colorScheme);
      }

      if (currentStroke.length > 0) {
        drawStroke(
          ctx,
          { points: currentStroke, tool: activeTool, width: strokeWidth, color: STROKE_COLOR[colorScheme] },
          colorScheme
        );
      }
    });

    return () => cancelAnimationFrame(rafId);
  }, [strokes, currentStroke, colorScheme, strokeWidth, activeTool, canvasRef]);

  // Use getBoundingClientRect to get exact canvas-relative coordinates.
  // This handles any margin/padding/transform on parent elements.
  const getPoint = (e: React.PointerEvent<HTMLCanvasElement>): Point => {
    const rect = e.currentTarget.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      pressure: e.pressure > 0 ? e.pressure : 0.5,
    };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    isDrawingRef.current = true;
    onStrokeStart(getPoint(e));
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    onStrokeMove(getPoint(e));
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    onStrokeEnd();
    try { e.currentTarget.releasePointerCapture(e.pointerId); } catch {}
  };

  const handlePointerLeave = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    onStrokeEnd();
    try { e.currentTarget.releasePointerCapture(e.pointerId); } catch {}
  };

  return (
    <canvas
      ref={canvasRef}
      style={{ width: '100vw', height: '100vh', display: 'block', touchAction: 'none' }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerLeave}
      onTouchStart={(e) => {
        if (e.touches.length !== 1) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const t = e.touches[0];
        isDrawingRef.current = true;
        onStrokeStart({ x: t.clientX - rect.left, y: t.clientY - rect.top, pressure: 0.5 });
      }}
      onTouchMove={(e) => {
        if (e.touches.length !== 1 || !isDrawingRef.current) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const t = e.touches[0];
        onStrokeMove({ x: t.clientX - rect.left, y: t.clientY - rect.top, pressure: 0.5 });
      }}
      onTouchEnd={() => {
        if (!isDrawingRef.current) return;
        isDrawingRef.current = false;
        onStrokeEnd();
      }}
    />
  );
}

export default DrawingCanvas;
