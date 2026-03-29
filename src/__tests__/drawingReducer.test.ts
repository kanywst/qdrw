import { drawingReducer, initialState } from '../reducers/drawingReducer';
import type { Point } from '../types';

const p = (x: number, y: number): Point => ({ x, y, pressure: 0.5 });

describe('drawingReducer', () => {
  describe('STROKE_START', () => {
    it('sets currentStroke to [point]', () => {
      const point = p(10, 20);
      const state = drawingReducer(initialState, { type: 'STROKE_START', point });
      expect(state.currentStroke).toEqual([point]);
    });
  });

  describe('STROKE_MOVE', () => {
    it('appends point to currentStroke', () => {
      const p1 = p(10, 20);
      const p2 = p(30, 40);
      let state = drawingReducer(initialState, { type: 'STROKE_START', point: p1 });
      state = drawingReducer(state, { type: 'STROKE_MOVE', point: p2 });
      expect(state.currentStroke).toEqual([p1, p2]);
    });
  });

  describe('STROKE_END', () => {
    it('appends currentStroke to strokes and clears currentStroke', () => {
      const p1 = p(10, 20);
      let state = drawingReducer(initialState, { type: 'STROKE_START', point: p1 });
      state = drawingReducer(state, { type: 'STROKE_END' });
      expect(state.strokes).toHaveLength(1);
      expect(state.strokes[0].points).toEqual([p1]);
      expect(state.currentStroke).toEqual([]);
    });
  });

  describe('UNDO', () => {
    it('is a no-op when history is empty (edge-case 6.3)', () => {
      // initialState has strokes: []
      const state = drawingReducer(initialState, { type: 'UNDO' });
      expect(state.strokes).toHaveLength(0);
      expect(state).toBe(initialState); // same reference — no new object created
    });
  });

  describe('CLEAR', () => {
    it('resets strokes to empty (8.2)', () => {
      // Build up some strokes first
      let state = drawingReducer(initialState, { type: 'STROKE_START', point: p(0, 0) });
      state = drawingReducer(state, { type: 'STROKE_END' });
      state = drawingReducer(state, { type: 'STROKE_START', point: p(5, 5) });
      state = drawingReducer(state, { type: 'STROKE_END' });
      expect(state.strokes.length).toBeGreaterThan(0);

      const cleared = drawingReducer(state, { type: 'CLEAR' });
      expect(cleared.strokes).toHaveLength(0);
      expect(cleared.currentStroke).toHaveLength(0);
    });
  });
});
