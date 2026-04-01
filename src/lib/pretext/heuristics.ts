import type {
  AxisTableRiskState,
  BalancedWidthCandidate,
  EvidenceColumnCandidate,
  StageFitState,
  WrapFigureMode,
} from './types';

type BalancedWidthOptions = {
  minLines?: number;
  maxLines?: number;
  preferredLines?: number;
};

const linePenalty = (value: number, minLines?: number, maxLines?: number): number => {
  if (minLines !== undefined && value < minLines) {
    return (minLines - value) * 500;
  }

  if (maxLines !== undefined && value > maxLines) {
    return (value - maxLines) * 500;
  }

  return 0;
};

export const chooseBalancedWidth = (
  candidates: BalancedWidthCandidate[],
  options: BalancedWidthOptions,
): BalancedWidthCandidate | null => {
  if (candidates.length === 0) {
    return null;
  }

  const preferredLines = options.preferredLines ?? options.minLines ?? options.maxLines ?? candidates[0]?.lineCount ?? 2;
  let bestCandidate = candidates[0] ?? null;
  let bestScore = Number.POSITIVE_INFINITY;

  for (const candidate of candidates) {
    const preferredPenalty = Math.abs(candidate.lineCount - preferredLines) * 120;
    const fillPenalty = Math.max(0, candidate.width - candidate.widestLineWidth) * 0.06;
    const raggednessPenalty = candidate.raggedness * 200;
    const score =
      linePenalty(candidate.lineCount, options.minLines, options.maxLines) +
      preferredPenalty +
      fillPenalty +
      raggednessPenalty;

    if (score < bestScore) {
      bestScore = score;
      bestCandidate = candidate;
    }
  }

  return bestCandidate;
};

export const chooseEvidenceColumns = (candidates: EvidenceColumnCandidate[]): 1 | 2 | 3 => {
  if (candidates.length === 0) {
    return 1;
  }

  let bestColumns = candidates[0]?.columns ?? 1;
  let bestScore = Number.POSITIVE_INFINITY;

  for (const candidate of candidates) {
    const heights = candidate.heights;
    if (heights.length === 0) {
      return candidate.columns;
    }

    const minHeight = Math.min(...heights);
    const maxHeight = Math.max(...heights);
    const averageHeight = heights.reduce((sum, value) => sum + value, 0) / heights.length;
    const imbalancePenalty = maxHeight - minHeight;
    const densityPenalty = averageHeight * 0.18;
    const score = imbalancePenalty + densityPenalty;

    if (score < bestScore) {
      bestScore = score;
      bestColumns = candidate.columns;
    }
  }

  return bestColumns;
};

export const classifyStageHeroFit = ({
  contentHeight,
  viewportHeight,
  maxViewportRatio = 0.92,
}: {
  contentHeight: number;
  viewportHeight: number;
  maxViewportRatio?: number;
}): StageFitState => {
  if (viewportHeight <= 0) {
    return 'stage-fit-ok';
  }

  const ratio = contentHeight / viewportHeight;
  if (ratio > 1) {
    return 'stage-fit-overflow';
  }

  if (ratio > maxViewportRatio) {
    return 'stage-fit-tight';
  }

  return 'stage-fit-ok';
};

export const classifyAxisTableRisk = ({
  availableWidth,
  columnCount,
  estimatedMinTableWidth,
  maxCellLineCount,
  averageCellLineCount,
}: {
  availableWidth: number;
  columnCount: number;
  estimatedMinTableWidth: number;
  maxCellLineCount: number;
  averageCellLineCount: number;
}): AxisTableRiskState => {
  let score = 0;

  if (estimatedMinTableWidth > availableWidth * 1.08) {
    score += 2;
  }

  if (columnCount >= 3) {
    score += 1;
  }

  if (maxCellLineCount >= 4) {
    score += 1;
  }

  if (averageCellLineCount >= 2.5) {
    score += 1;
  }

  return score >= 2 ? 'high' : 'low';
};

export const decideWrapFigureMode = ({
  narrowLineCount,
  narrowSlotWidth,
  fullWidthLineCount,
  wrappedLineCount,
}: {
  narrowLineCount: number;
  narrowSlotWidth: number;
  fullWidthLineCount: number;
  wrappedLineCount: number;
}): WrapFigureMode => {
  if (narrowLineCount < 2) {
    return 'stacked';
  }

  if (narrowSlotWidth < 120) {
    return 'stacked';
  }

  if (wrappedLineCount - fullWidthLineCount > 2) {
    return 'stacked';
  }

  return 'wrap';
};
