import fc from 'fast-check';
import { drawingReducer, initialState } from '../reducers/drawingReducer';
import { MAX_HISTORY_SIZE } from '../types';
import type { DrawingState, Point } from '../types';

const arbitraryPoint = fc.record({
  x: fc.float({ noNaN: true }),
  y: fc.float({ noNaN: true }),
  pressure: fc.float({ min: 0, max: 1, noNaN: true }),
});

/**
 * Build a state with strokes by dispatching STROKE_START + STROKE_END for each point.
 * Each point becomes its own single-point stroke.
 */
function buildStateWithStrokes(points: Point[]): DrawingState {
  let state = initialState;
  for (const point of points) {
    state = drawingReducer(state, { type: 'STROKE_START', point });
    state = drawingReducer(state, { type: 'STROKE_END' });
  }
  return state;
}

/**
 * Property 4: Stroke recording completeness
 * Validates: Requirements 4.1
 */
test('Property 4: Stroke recording completeness', () => {
  fc.assert(
    fc.property(
      fc.array(arbitraryPoint, { minLength: 1 }),
      (points) => {
        let state = initialState;
        // STROKE_START with first point
        state = drawingReducer(state, { type: 'STROKE_START', point: points[0] });
        // STROKE_MOVE for remaining points
        for (let i = 1; i < points.length; i++) {
          state = drawingReducer(state, { type: 'STROKE_MOVE', point: points[i] });
        }
        // currentStroke should contain all points in order
        if (state.currentStroke.length !== points.length) return false;
        for (let i = 0; i < points.length; i++) {
          if (
            state.currentStroke[i].x !== points[i].x ||
            state.currentStroke[i].y !== points[i].y ||
            state.currentStroke[i].pressure !== points[i].pressure
          ) {
            return false;
          }
        }
        return true;
      }
    ),
    { numRuns: 100 }
  );
});

/**
 * Property 5: Stroke finalization appends to history
 * Validates: Requirements 4.4
 */
test('Property 5: Stroke finalization appends to history', () => {
  fc.assert(
    fc.property(
      fc.array(arbitraryPoint, { minLength: 1 }),
      (points) => {
        let state = initialState;
        const before = state.strokes.length;
        // STROKE_START + STROKE_MOVE(s) + STROKE_END
        state = drawingReducer(state, { type: 'STROKE_START', point: points[0] });
        for (let i = 1; i < points.length; i++) {
          state = drawingReducer(state, { type: 'STROKE_MOVE', point: points[i] });
        }
        state = drawingReducer(state, { type: 'STROKE_END' });
        return state.strokes.length === before + 1;
      }
    ),
    { numRuns: 100 }
  );
});

/**
 * Property 6: Undo decreases history length by one
 * Validates: Requirements 6.2
 */
test('Property 6: Undo decreases history length by one', () => {
  fc.assert(
    fc.property(
      fc.array(arbitraryPoint, { minLength: 1, maxLength: 50 }),
      (points) => {
        // Build state with one stroke per point
        const state = buildStateWithStrokes(points);
        const before = state.strokes.length;
        const after = drawingReducer(state, { type: 'UNDO' });
        return after.strokes.length === before - 1;
      }
    ),
    { numRuns: 100 }
  );
});

/**
 * Property 7: StrokeHistory preserves insertion order
 * Validates: Requirements 6.1
 */
test('Property 7: StrokeHistory preserves insertion order', () => {
  fc.assert(
    fc.property(
      fc.array(arbitraryPoint, { minLength: 2, maxLength: 50 }),
      (points) => {
        // Build state with one stroke per point, collect stroke ids in order
        let state = initialState;
        const addedIds: string[] = [];
        for (const point of points) {
          state = drawingReducer(state, { type: 'STROKE_START', point });
          state = drawingReducer(state, { type: 'STROKE_END' });
          // The last added stroke is at the end of strokes array
          addedIds.push(state.strokes[state.strokes.length - 1].id);
        }
        // Verify all strokes appear in insertion order
        for (let i = 0; i < state.strokes.length; i++) {
          const expectedId = addedIds[addedIds.length - state.strokes.length + i];
          if (state.strokes[i].id !== expectedId) return false;
        }
        return true;
      }
    ),
    { numRuns: 100 }
  );
});

/**
 * Property 8: StrokeHistory capacity invariant
 * Validates: Requirements 6.4
 */
test('Property 8: StrokeHistory capacity invariant', () => {
  fc.assert(
    fc.property(
      fc.array(arbitraryPoint, { minLength: 51, maxLength: 200 }),
      (points) => {
        const state = buildStateWithStrokes(points);
        return state.strokes.length <= MAX_HISTORY_SIZE;
      }
    ),
    { numRuns: 100 }
  );
});

/**
 * Property 11: Clear resets stroke history
 * Validates: Requirements 8.2
 */
test('Property 11: Clear resets stroke history', () => {
  fc.assert(
    fc.property(
      fc.array(arbitraryPoint, { minLength: 1, maxLength: 50 }),
      (points) => {
        const state = buildStateWithStrokes(points);
        const cleared = drawingReducer(state, { type: 'CLEAR' });
        return cleared.strokes.length === 0;
      }
    ),
    { numRuns: 100 }
  );
});
