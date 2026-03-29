import { useReducer } from 'react';
import type React from 'react';
import { drawingReducer, initialState } from '../reducers/drawingReducer';
import type { Stroke, Point, ActiveTool, StrokeWidth, DrawingAction } from '../types';
import type { ColorScheme } from '../types';
import { autoCrop } from '../utils/autoCrop';

interface UseDrawingReturn {
  strokes: Stroke[];
  currentStroke: Point[];
  activeTool: ActiveTool;
  strokeWidth: StrokeWidth;
  isDrawing: boolean;
  dispatch: React.Dispatch<DrawingAction>;
  handleCopy: (canvasRef: React.RefObject<HTMLCanvasElement | null>, colorScheme: ColorScheme) => Promise<void>;
  handleClear: () => void;
}

export function useDrawing(): UseDrawingReturn {
  const [state, dispatch] = useReducer(drawingReducer, initialState);

  const isDrawing = state.currentStroke.length > 0;

  const handleClear = () => {
    dispatch({ type: 'CLEAR' });
  };

  const handleCopy = (
    canvasRef: React.RefObject<HTMLCanvasElement | null>,
    colorScheme: ColorScheme
  ): Promise<void> => {
    return autoCrop(canvasRef, colorScheme);
  };

  return {
    strokes: state.strokes,
    currentStroke: state.currentStroke,
    activeTool: state.activeTool,
    strokeWidth: state.strokeWidth,
    isDrawing,
    dispatch,
    handleCopy,
    handleClear,
  };
}

export default useDrawing;
