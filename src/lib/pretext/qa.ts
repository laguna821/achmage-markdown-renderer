import type {PretextQaCode, PretextQaFinding, PretextQaLevel} from './types';

const findingKey = (finding: PretextQaFinding): string =>
  [
    finding.slug,
    finding.sectionId ?? '',
    finding.blockIndex ?? '',
    finding.code,
    finding.message,
  ].join('::');

export const createQaFinding = ({
  level = 'warn',
  code,
  message,
  slug,
  sectionId,
  blockIndex,
  meta,
}: {
  level?: PretextQaLevel;
  code: PretextQaCode;
  message: string;
  slug: string;
  sectionId?: string;
  blockIndex?: number;
  meta?: Record<string, unknown>;
}): PretextQaFinding => ({
  level,
  code,
  message,
  slug,
  sectionId,
  blockIndex,
  meta,
});

export const dedupeQaFindings = (findings: PretextQaFinding[]): PretextQaFinding[] => {
  const seen = new Set<string>();
  const unique: PretextQaFinding[] = [];

  for (const finding of findings) {
    const key = findingKey(finding);
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    unique.push(finding);
  }

  return unique;
};
