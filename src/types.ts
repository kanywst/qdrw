// Core data types for qdrw

export interface Point {
  x: number;
  y: number;
  pressure: number; // 0.0–1.0, mouse fixed at 0.5
}

export type ActiveTool = 'brush' | 'eraser';

export type StrokeWidth = 'S' | 'M' | 'L';

export type ColorScheme = 'light' | 'dark';

export interface Stroke {
  id: string;
  points: Point[];
  tool: ActiveTool;
  width: StrokeWidth;
  color: string;
  timestamp: number;
}

// Constants

export const STROKE_WIDTH_PX: Record<StrokeWidth, number> = {
  S: 3,
  M: 6,
  L: 12,
};

export const COLOR_SCHEME_CONFIG: Record<
  ColorScheme,
  { background: string; stroke: string; toolbar: string; accent: string }
> = {
  dark: {
    background: 'oklch(10% 0 0)',
    stroke: 'oklch(95% 0 0)',
    toolbar: 'oklch(18% 0 0 / 0.85)',
    accent: 'oklch(75% 0.15 250 / 0.08)',
  },
  light: {
    background: 'oklch(98% 0 0)',
    stroke: 'oklch(12% 0 0)',
    toolbar: 'oklch(100% 0 0 / 0.85)',
    accent: 'oklch(55% 0.18 250 / 0.08)',
  },
};

export const MAX_HISTORY_SIZE = 50;

export const EXPORT_PADDING = 16;

// State and Action types

export interface DrawingState {
  strokes: Stroke[];
  currentStroke: Point[];
  activeTool: ActiveTool;
  strokeWidth: StrokeWidth;
}

export type DrawingAction =
  | { type: 'STROKE_START'; point: Point }
  | { type: 'STROKE_MOVE'; point: Point }
  | { type: 'STROKE_END' }
  | { type: 'UNDO' }
  | { type: 'CLEAR' }
  | { type: 'SET_TOOL'; tool: ActiveTool }
  | { type: 'SET_WIDTH'; width: StrokeWidth };
