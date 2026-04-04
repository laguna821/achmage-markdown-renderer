export type ActiveHeadingPosition = {
  id: string;
  top: number;
};

type ActiveHeadingLineOptions = {
  viewportHeight: number;
  scrollTop: number;
  maxScroll: number;
  baseLineRatio?: number;
};

const DEFAULT_BASE_LINE_RATIO = 0.2;

const clamp = (value: number, min: number, max: number): number => Math.min(Math.max(value, min), max);

export const getActiveHeadingLine = ({
  viewportHeight,
  scrollTop,
  maxScroll,
  baseLineRatio = DEFAULT_BASE_LINE_RATIO,
}: ActiveHeadingLineOptions): number => {
  const safeViewportHeight = Math.max(viewportHeight, 0);
  const safeMaxScroll = Math.max(maxScroll, 0);
  const baseLine = safeViewportHeight * baseLineRatio;

  if (safeViewportHeight === 0 || safeMaxScroll === 0) {
    return baseLine;
  }

  const shiftDistance = safeViewportHeight - baseLine;
  const shiftStart = Math.max(0, safeMaxScroll - shiftDistance);
  const shiftRange = Math.max(safeMaxScroll - shiftStart, 1);
  const progress = clamp((scrollTop - shiftStart) / shiftRange, 0, 1);

  return baseLine + progress * (safeViewportHeight - baseLine);
};

export const findActiveHeadingId = (
  headings: readonly ActiveHeadingPosition[],
  activationLine: number,
): string | null => {
  if (headings.length === 0) {
    return null;
  }

  const orderedHeadings = headings
    .map((heading, index) => ({...heading, index}))
    .sort((left, right) => {
      if (left.top === right.top) {
        return left.index - right.index;
      }

      return left.top - right.top;
    });

  let activeId = orderedHeadings[0]?.id ?? null;

  for (const heading of orderedHeadings) {
    if (heading.top <= activationLine) {
      activeId = heading.id;
      continue;
    }

    break;
  }

  return activeId;
};
