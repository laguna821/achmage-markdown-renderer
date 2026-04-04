export type ActiveHeadingPosition = {
  id: string;
  top: number;
};

export const findActiveHeadingId = (
  headings: readonly ActiveHeadingPosition[],
  activationTop: number,
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
    if (heading.top <= activationTop) {
      activeId = heading.id;
      continue;
    }

    break;
  }

  return activeId;
};
