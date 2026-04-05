export type ActiveHeadingPosition = {
  id: string;
  top: number;
};

type ResolveActiveHeadingIndexOptions = {
  headings: readonly ActiveHeadingPosition[];
  currentIndex: number;
  previousScrollTop: number;
  currentScrollTop: number;
  activationLine: number;
  forceSnap?: boolean;
  largeJumpThreshold?: number;
};

type ResolveActiveHeadingIndexResult = {
  nextIndex: number;
  targetIndex: number;
  needsAnotherFrame: boolean;
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

  let activeId = headings[0]?.id ?? null;

  for (const heading of headings) {
    if (heading.top <= activationLine) {
      activeId = heading.id;
      continue;
    }

    break;
  }

  return activeId;
};

export const findActiveHeadingIndex = (
  headings: readonly ActiveHeadingPosition[],
  activationLine: number,
): number => {
  if (headings.length === 0) {
    return -1;
  }

  let activeIndex = 0;

  for (let index = 0; index < headings.length; index += 1) {
    if ((headings[index]?.top ?? Number.POSITIVE_INFINITY) <= activationLine) {
      activeIndex = index;
      continue;
    }

    break;
  }

  return activeIndex;
};

export const resolveActiveHeadingIndex = ({
  headings,
  currentIndex,
  previousScrollTop,
  currentScrollTop,
  activationLine,
  forceSnap = false,
  largeJumpThreshold = Number.POSITIVE_INFINITY,
}: ResolveActiveHeadingIndexOptions): ResolveActiveHeadingIndexResult => {
  const targetIndex = findActiveHeadingIndex(headings, activationLine);

  if (targetIndex < 0) {
    return {
      nextIndex: -1,
      targetIndex: -1,
      needsAnotherFrame: false,
    };
  }

  if (currentIndex < 0) {
    return {
      nextIndex: targetIndex,
      targetIndex,
      needsAnotherFrame: false,
    };
  }

  const isLargeJump = Math.abs(currentScrollTop - previousScrollTop) >= largeJumpThreshold;

  if (forceSnap || isLargeJump || targetIndex === currentIndex) {
    return {
      nextIndex: targetIndex,
      targetIndex,
      needsAnotherFrame: false,
    };
  }

  const direction = targetIndex > currentIndex ? 1 : -1;
  const nextIndex = currentIndex + direction;

  return {
    nextIndex,
    targetIndex,
    needsAnotherFrame: nextIndex !== targetIndex,
  };
};
