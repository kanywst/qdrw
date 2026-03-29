import type { DrawingState, DrawingAction } from '../types';
import { MAX_HISTORY_SIZE } from '../types';

export const initialState: DrawingState = {
  strokes: [],
  currentStroke: [],
  activeTool: 'brush',
  strokeWidth: 'M',
};

export function drawingReducer(state: DrawingState, action: DrawingAction): DrawingState {
  switch (action.type) {
    case 'STROKE_START':
      return { ...state, currentStroke: [action.point] };

    case 'STROKE_MOVE':
      return { ...state, currentStroke: [...state.currentStroke, action.point] };

    case 'STROKE_END': {
      if (state.currentStroke.length === 0) return state;
      const newStroke = {
        id: crypto.randomUUID(),
        points: state.currentStroke,
        tool: state.activeTool,
        width: state.strokeWidth,
        color: '',
        timestamp: Date.now(),
      };
      let strokes = [...state.strokes, newStroke];
      if (strokes.length > MAX_HISTORY_SIZE) {
        strokes = strokes.slice(strokes.length - MAX_HISTORY_SIZE);
      }
      return { ...state, strokes, currentStroke: [] };
    }

    case 'UNDO':
      if (state.strokes.length === 0) return state;
      return { ...state, strokes: state.strokes.slice(0, -1) };

    case 'CLEAR':
      return { ...state, strokes: [], currentStroke: [] };

    case 'SET_TOOL':
      return { ...state, activeTool: action.tool };

    case 'SET_WIDTH':
      return { ...state, strokeWidth: action.width };

    default:
      return state;
  }
}

export default drawingReducer;
