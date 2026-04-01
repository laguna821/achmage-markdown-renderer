import {describe, expect, test} from 'vitest';

import {
  chooseBalancedWidth,
  chooseEvidenceColumns,
  classifyAxisTableRisk,
  classifyStageHeroFit,
  decideWrapFigureMode,
} from '../src/lib/pretext/heuristics';

describe('pretext heuristics', () => {
  test('prefers widths that satisfy the preferred line window and reduce raggedness', () => {
    const winner = chooseBalancedWidth(
      [
        {width: 960, lineCount: 1, widestLineWidth: 960, raggedness: 0},
        {width: 720, lineCount: 2, widestLineWidth: 700, raggedness: 0.24},
        {width: 660, lineCount: 2, widestLineWidth: 640, raggedness: 0.08},
        {width: 520, lineCount: 4, widestLineWidth: 490, raggedness: 0.05},
      ],
      {minLines: 2, maxLines: 3, preferredLines: 2},
    );

    expect(winner?.width).toBe(660);
  });

  test('chooses the most balanced evidence grid column count', () => {
    const columns = chooseEvidenceColumns([
      {columns: 1, heights: [420, 448, 431, 440]},
      {columns: 2, heights: [280, 286, 291, 288]},
      {columns: 3, heights: [210, 366, 224, 355]},
    ]);

    expect(columns).toBe(2);
  });

  test('classifies stage hero fit states by viewport ratio', () => {
    expect(classifyStageHeroFit({contentHeight: 820, viewportHeight: 1000})).toBe('stage-fit-ok');
    expect(classifyStageHeroFit({contentHeight: 930, viewportHeight: 1000})).toBe('stage-fit-tight');
    expect(classifyStageHeroFit({contentHeight: 1010, viewportHeight: 1000})).toBe('stage-fit-overflow');
  });

  test('marks dense comparison tables as a mobile risk', () => {
    expect(
      classifyAxisTableRisk({
        availableWidth: 390,
        columnCount: 3,
        estimatedMinTableWidth: 620,
        maxCellLineCount: 5,
        averageCellLineCount: 3.5,
      }),
    ).toBe('high');

    expect(
      classifyAxisTableRisk({
        availableWidth: 390,
        columnCount: 2,
        estimatedMinTableWidth: 280,
        maxCellLineCount: 2,
        averageCellLineCount: 1.4,
      }),
    ).toBe('low');
  });

  test('falls back from wrap-around figures when the narrow slot is too constrained', () => {
    expect(
      decideWrapFigureMode({
        narrowLineCount: 6,
        narrowSlotWidth: 92,
        fullWidthLineCount: 10,
        wrappedLineCount: 13,
      }),
    ).toBe('stacked');

    expect(
      decideWrapFigureMode({
        narrowLineCount: 4,
        narrowSlotWidth: 180,
        fullWidthLineCount: 11,
        wrappedLineCount: 12,
      }),
    ).toBe('wrap');
  });
});
