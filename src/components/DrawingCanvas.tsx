import React, { useEffect, useCallback } from 'react';
import { getStroke } from 'perfect-freehand';
import type { Stroke, Point, ActiveTool, StrokeWidth, ColorScheme } from '../types';
import { STROKE_WIDTH_PX, COLOR_SCHEME_CONFIG } from '../types';

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
    const midX = (curr[0] + next[0]) / 2;
    const midY = (curr[1] + next[1]) / 2;
    d.push(`Q ${curr[0]} ${curr[1]} ${midX} ${midY}`);
  }

  d.push('Z');
  return d.join(' ');
}

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
      thinning: 0.5,
      smoothing: 0.5,
      streamline: 0.5,
      simulatePressure: true,
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
    ctx.fillStyle = COLOR_SCHEME_CONFIG[colorScheme].stroke;
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

  // Resize canvas to match window dimensions
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

  // Update custom cursor based on active tool and stroke width
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const size = STROKE_WIDTH_PX[strokeWidth];

    if (activeTool === 'brush') {
      const r = Math.max(size / 2, 3);
      const svgSize = r * 2 + 4;
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${svgSize}" height="${svgSize}">
      <circle cx="${svgSize/2}" cy="${svgSize/2}" r="${r}" fill="currentColor" opacity="0.8"/>
    </svg>`;
      const encoded = encodeURIComponent(svg);
      canvas.style.cursor = `url("data:image/svg+xml,${encoded}") ${svgSize/2} ${svgSize/2}, none`;
    } else {
      const eraserRadius = size * 2;
      const svgSize = eraserRadius * 2 + 8;
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${svgSize}" height="${svgSize}">
      <circle cx="${svgSize/2}" cy="${svgSize/2}" r="${eraserRadius}" fill="none" stroke="currentColor" stroke-width="1.5" stroke-dasharray="4 3" opacity="0.7"/>
    </svg>`;
      const encoded = encodeURIComponent(svg);
      canvas.style.cursor = `url("data:image/svg+xml,${encoded}") ${svgSize/2} ${svgSize/2}, none`;
    }
  }, [activeTool, strokeWidth, canvasRef]);

  // Redraw all strokes when state changes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let rafId: number;

    rafId = requestAnimationFrame(() => {
      // Clear with background color
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = COLOR_SCHEME_CONFIG[colorScheme].background;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw all committed strokes
      for (const stroke of strokes) {
        drawStroke(ctx, stroke, colorScheme);
      }

      // Draw current in-progress stroke
      if (currentStroke.length > 0) {
        drawStroke(
          ctx,
          { points: currentStroke, tool: activeTool, width: strokeWidth, color: COLOR_SCHEME_CONFIG[colorScheme].stroke },
          colorScheme
        );
      }
    });

    return () => cancelAnimationFrame(rafId);
  }, [strokes, currentStroke, colorScheme, strokeWidth, activeTool, canvasRef]);

  const getPoint = (e: React.PointerEvent<HTMLCanvasElement>): Point => ({
    x: e.clientX,
    y: e.clientY,
    pressure: e.pressure > 0 ? e.pressure : 0.5,
  });

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    isDrawingRef.current = true;
    onStrokeStart(getPoint(e));
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    onStrokeMove(getPoint(e));
  };

  const handlePointerUp = () => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    onStrokeEnd();
  };

  return (
    <canvas
      ref={canvasRef}
      style={{ width: '100vw', height: '100vh', display: 'block', touchAction: 'none', cursor: 'none' }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      onTouchStart={(e) => {
        if (e.touches.length !== 1) return; // allow multi-touch browser gestures
        const t = e.touches[0];
        isDrawingRef.current = true;
        onStrokeStart({ x: t.clientX, y: t.clientY, pressure: 0.5 });
      }}
      onTouchMove={(e) => {
        if (e.touches.length !== 1 || !isDrawingRef.current) return;
        const t = e.touches[0];
        onStrokeMove({ x: t.clientX, y: t.clientY, pressure: 0.5 });
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
