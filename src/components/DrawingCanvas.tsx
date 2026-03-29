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

// Hex colors for Canvas 2D API (oklch not supported everywhere)
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
  const dprRef = React.useRef(window.devicePixelRatio || 1);

  // Resize canvas accounting for devicePixelRatio to fix coordinate offset on Retina
  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    dprRef.current = dpr;
    const w = window.innerWidth;
    const h = window.innerHeight;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    // CSS size stays at 100vw × 100vh — no inline width/height needed
    const ctx = canvas.getContext('2d');
    if (ctx) ctx.scale(dpr, dpr);
  }, [canvasRef]);

  useEffect(() => {
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    return () => window.removeEventListener('resize', resizeCanvas);
  }, [resizeCanvas]);

  // Custom cursor — bright, fun, with glow
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const size = STROKE_WIDTH_PX[strokeWidth];
    const accent = colorScheme === 'dark' ? '#7dd3fc' : '#2563eb'; // sky blue accent

    if (activeTool === 'brush') {
      const r = Math.max(size / 2 + 2, 5);
      const svgSize = (r + 6) * 2;
      const cx = svgSize / 2;
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${svgSize}" height="${svgSize}">
        <circle cx="${cx}" cy="${cx}" r="${r + 4}" fill="${accent}" opacity="0.18"/>
        <circle cx="${cx}" cy="${cx}" r="${r}" fill="${accent}" opacity="0.9"/>
      </svg>`;
      canvas.style.cursor = `url("data:image/svg+xml,${encodeURIComponent(svg)}") ${cx} ${cx}, none`;
    } else {
      const er = size * 2 + 4;
      const svgSize = (er + 4) * 2;
      const cx = svgSize / 2;
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${svgSize}" height="${svgSize}">
        <circle cx="${cx}" cy="${cx}" r="${er}" fill="none" stroke="${accent}" stroke-width="2" stroke-dasharray="5 3" opacity="0.85"/>
        <circle cx="${cx}" cy="${cx}" r="2" fill="${accent}" opacity="0.9"/>
      </svg>`;
      canvas.style.cursor = `url("data:image/svg+xml,${encodeURIComponent(svg)}") ${cx} ${cx}, none`;
    }
  }, [activeTool, strokeWidth, colorScheme, canvasRef]);

  // Redraw — context is already scaled by dpr, so use CSS pixel coords directly
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rafId = requestAnimationFrame(() => {
      const dpr = dprRef.current;
      const w = canvas.width / dpr;
      const h = canvas.height / dpr;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = BACKGROUND_COLOR[colorScheme];
      ctx.fillRect(0, 0, w, h);

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

  // Coordinates: clientX/Y are CSS pixels, canvas context is scaled to match
  const getPoint = (e: React.PointerEvent<HTMLCanvasElement>): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: e.clientX, y: e.clientY, pressure: 0.5 };
    const rect = canvas.getBoundingClientRect();
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
    e.currentTarget.releasePointerCapture(e.pointerId);
  };

  return (
    <canvas
      ref={canvasRef}
      style={{ width: '100vw', height: '100vh', display: 'block', touchAction: 'none' }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={(e) => {
        if (!isDrawingRef.current) return;
        isDrawingRef.current = false;
        onStrokeEnd();
        e.currentTarget.releasePointerCapture(e.pointerId);
      }}
      onTouchStart={(e) => {
        if (e.touches.length !== 1) return;
        const canvas = canvasRef.current;
        const t = e.touches[0];
        const rect = canvas?.getBoundingClientRect();
        isDrawingRef.current = true;
        onStrokeStart({
          x: t.clientX - (rect?.left ?? 0),
          y: t.clientY - (rect?.top ?? 0),
          pressure: 0.5,
        });
      }}
      onTouchMove={(e) => {
        if (e.touches.length !== 1 || !isDrawingRef.current) return;
        const canvas = canvasRef.current;
        const t = e.touches[0];
        const rect = canvas?.getBoundingClientRect();
        onStrokeMove({
          x: t.clientX - (rect?.left ?? 0),
          y: t.clientY - (rect?.top ?? 0),
          pressure: 0.5,
        });
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
