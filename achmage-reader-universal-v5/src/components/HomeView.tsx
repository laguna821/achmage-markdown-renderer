import {useCallback, useEffect, useMemo, useState} from 'react';

import {
  buildHomeSearchEntries,
  buildHomeSearchTagCounts,
  parseHomeSearchExpression,
  prepareHomeSearchEntries,
  searchPreparedHomeEntries,
  type HomeSearchState,
  type NormalizedDoc,
  type SourceDocument,
} from '../core/content';
import {getDocumentModeLinks} from '../stage';

type HomeViewProps = {
  docs: NormalizedDoc[];
  sourceDocuments: SourceDocument[];
  selectedVaultPath: string | null;
  loading: boolean;
  searchState: HomeSearchState;
  onSearchStateChange: (state: HomeSearchState) => void;
  onOpenDoc: (output: 'reader' | 'stage' | 'newsletter', slug: string) => void;
  onSelectVault: () => void;
  onRescan: () => void;
};

const renderMatchedFieldLabel = (field: string): string => {
  switch (field) {
    case 'title':
      return '제목';
    case 'summary':
      return '요약';
    case 'yaml':
      return 'YAML';
    case 'body':
      return '본문';
    case 'tag':
      return '태그';
    default:
      return field;
  }
};

export function HomeView({
  docs,
  sourceDocuments,
  selectedVaultPath,
  loading,
  searchState,
  onSearchStateChange,
  onOpenDoc,
  onSelectVault,
  onRescan,
}: HomeViewProps) {
  const [searchIndex, setSearchIndex] = useState<{
    entries: ReturnType<typeof buildHomeSearchEntries>;
    preparedEntries: ReturnType<typeof prepareHomeSearchEntries>;
    tagCounts: ReturnType<typeof buildHomeSearchTagCounts>;
  } | null>(null);

  const ensureSearchIndex = useCallback(() => {
    setSearchIndex((current) => {
      if (current) {
        return current;
      }

      const entries = buildHomeSearchEntries(sourceDocuments);
      return {
        entries,
        preparedEntries: prepareHomeSearchEntries(entries),
        tagCounts: buildHomeSearchTagCounts(entries),
      };
    });
  }, [sourceDocuments]);

  useEffect(() => {
    setSearchIndex(null);
  }, [sourceDocuments]);

  useEffect(() => {
    if (searchState.query.trim().length > 0 || searchState.tags.length > 0) {
      ensureSearchIndex();
    }
  }, [ensureSearchIndex, searchState.query, searchState.tags]);

  const results = useMemo(
    () => (searchIndex ? searchPreparedHomeEntries(searchIndex.preparedEntries, searchState) : []),
    [searchIndex, searchState],
  );
  const tagCounts = searchIndex?.tagCounts ?? [];
  const parsedQuery = useMemo(() => parseHomeSearchExpression(searchState.query), [searchState.query]);
  const active = searchState.query.trim().length > 0 || searchState.tags.length > 0;
  const resultMap = new Map(results.map((result) => [result.entry.slug, result]));

  return (
    <main className="home-shell">
      <section className="home-hero" data-mega="ACHMAGE">
        <div className="home-hero__eyebrow">마크다운 소스 오브 트루스</div>
        <h1>
          기록은 단순하게,
          <br />
          보여짐은 완벽하게.
        </h1>
        <p className="home-hero__lede">
          마크다운 하나면 충분합니다.
          <br />
          코딩 없이도 모든 텍스트와 데이터가 제자리를 찾는 혁신적인 자동 정렬 시스템을 만나보세요.
        </p>
        <p className="home-hero__source">
          현재 소스: <code>{selectedVaultPath ?? '아직 볼트를 선택하지 않았습니다'}</code>
        </p>
        <div className="home-card__links">
          <button className="home-search__clear" type="button" onClick={onSelectVault}>
            {selectedVaultPath ? '볼트 전환' : '볼트 선택'}
          </button>
          {selectedVaultPath ? (
            <button className="home-search__clear" type="button" onClick={onRescan}>
              볼트 다시 스캔
            </button>
          ) : null}
        </div>
      </section>

      <section className="home-list">
        <div className="home-list__toolbar">
          <div className="home-list__heading">
            <div className="home-list__eyebrow">문서 워크벤치</div>
            <h2>{selectedVaultPath ? '볼트 문서' : '기본 미리보기 문서'}</h2>
          </div>
          <p className="home-list__status">
            {docs.length}개 문서 / {active ? results.length : docs.length}개 표시 중
          </p>
          <div className="home-search">
            <label className="home-search__field">
              <span className="home-search__label">통합 검색</span>
              <input
                className="home-search__input"
                type="search"
                value={searchState.query}
                placeholder="제목, 본문, YAML, #태그를 통합 검색"
                onFocus={ensureSearchIndex}
                onChange={(event) => {
                  ensureSearchIndex();
                  onSearchStateChange({...searchState, query: event.currentTarget.value});
                }}
              />
            </label>
            <div className="home-search__bar">
              <div className="home-search__actions">
                <p className="home-search__hint">
                  <code>#tag</code>, <code>AND</code>, <code>OR</code>를 사용할 수 있습니다. 예: <code>AI AND #lecture</code>
                </p>
                {active ? (
                  <button
                    className="home-search__clear"
                    type="button"
                    onClick={() => onSearchStateChange({query: '', tags: []})}
                  >
                    필터 지우기
                  </button>
                ) : null}
              </div>
              {active ? (
                <div className="home-search__feedback">
                  <p className="home-search__feedback-copy">
                    {parsedQuery.hasOr
                      ? 'OR 그룹 검색이 활성화되었습니다.'
                      : parsedQuery.terms.length > 1
                        ? 'AND 검색이 활성화되었습니다.'
                        : '단일 검색어 검색이 활성화되었습니다.'}
                  </p>
                  <div className="home-search__feedback-chips">
                    {parsedQuery.terms.map((term, index) => (
                      <span
                        key={`${term.kind}-${term.raw}-${index}`}
                        className={`home-search__feedback-chip${term.kind === 'text' ? ' home-search__feedback-chip--query' : ''}`}
                      >
                        {term.kind === 'tag' ? `#${term.normalized}` : term.raw}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        {selectedVaultPath && searchIndex ? (
          <div className="home-search__feedback">
            <p className="home-search__feedback-copy">상위 태그</p>
            <div className="home-search__feedback-chips">
              {tagCounts.slice(0, 10).map((tag) => (
                <button
                  key={tag.tag}
                  className={`home-search__feedback-chip${searchState.tags.includes(tag.tag) ? ' home-search__feedback-chip--query' : ''}`}
                  type="button"
                  onClick={() => {
                    ensureSearchIndex();
                    onSearchStateChange({
                      ...searchState,
                      tags: searchState.tags.includes(tag.tag)
                        ? searchState.tags.filter((entry) => entry !== tag.tag)
                        : [...searchState.tags, tag.tag],
                    });
                  }}
                >
                  #{tag.tag} ({tag.count})
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {active && results.length === 0 ? (
          <div className="home-search__empty">
            <p>현재 조건에 맞는 문서가 없습니다.</p>
            <button type="button" onClick={() => onSearchStateChange({query: '', tags: []})}>
              필터 지우기
            </button>
          </div>
        ) : null}

        <div className="home-list__grid">
          {(active ? results.map((result) => docs.find((doc) => doc.slug === result.entry.slug)).filter(Boolean) : docs).map((doc) => {
            if (!doc) {
              return null;
            }

            const match = resultMap.get(doc.slug);

            return (
              <article key={doc.slug} className="home-card">
                <div className="home-card__meta">
                  <span>{doc.meta.docType}</span>
                  {doc.meta.date ? <span>{doc.meta.date}</span> : null}
                </div>
                <h3>{doc.meta.title}</h3>
                {match ? (
                  <div className="home-card__match">
                    일치 위치: {match.matchedFields.map(renderMatchedFieldLabel).join(' / ')}
                  </div>
                ) : null}
                {match?.matchedTags.length ? (
                  <div className="home-card__active-tags">
                    {match.matchedTags.map((tag) => (
                      <span key={tag} className="home-card__tag-chip">
                        #{tag}
                      </span>
                    ))}
                  </div>
                ) : null}
                {doc.meta.summary ? <p>{doc.meta.summary}</p> : null}
                {match?.excerpt ? <p className="home-card__excerpt">{match.excerpt}</p> : null}
                <div className="home-card__links">
                  {getDocumentModeLinks(doc).map((link) => (
                    <button
                      key={`${doc.slug}-${link.output}`}
                      className="home-search__clear"
                      type="button"
                      onClick={() => onOpenDoc(link.output, doc.slug)}
                    >
                      {link.label}
                    </button>
                  ))}
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {loading ? <p className="home-search__hint">볼트 검증이 아직 진행 중입니다...</p> : null}
    </main>
  );
}
