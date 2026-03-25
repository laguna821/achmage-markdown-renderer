const normalize = (value: string) => value.trim().toLowerCase();

export const aliasGroups = {
  reframe: new Set(['관점 전환', '질문 재설정', 'reframe', 'question reset', '다시 세운 질문'].map(normalize)),
  evidence: new Set(['현장 노트', '현장 증거', 'evidence', 'field notes', '사례'].map(normalize)),
  compare: new Set(['비교', 'axis', 'compare', '대립축'].map(normalize)),
  thesis: new Set(['thesis', '핵심 주장', '강의 목표', '요약'].map(normalize)),
} as const;

export const matchAlias = (group: keyof typeof aliasGroups, title: string): boolean =>
  aliasGroups[group].has(normalize(title));

export const extractEvidenceTag = (title: string): string | undefined => {
  const match = title.match(/(FIELD NOTE\s*#?\d+|CASE\s*#?\d+|사례\s*#?\d+)/i);
  return match?.[1];
};
