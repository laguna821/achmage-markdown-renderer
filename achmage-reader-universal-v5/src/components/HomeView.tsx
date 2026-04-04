import {useMemo} from 'react';

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
  const entries = useMemo(() => buildHomeSearchEntries(sourceDocuments), [sourceDocuments]);
  const preparedEntries = useMemo(() => prepareHomeSearchEntries(entries), [entries]);
  const results = useMemo(
    () => searchPreparedHomeEntries(preparedEntries, searchState),
    [preparedEntries, searchState],
  );
  const tagCounts = useMemo(() => buildHomeSearchTagCounts(entries), [entries]);
  const parsedQuery = useMemo(() => parseHomeSearchExpression(searchState.query), [searchState.query]);
  const active = searchState.query.trim().length > 0 || searchState.tags.length > 0;
  const resultMap = new Map(results.map((result) => [result.entry.slug, result]));

  return (
    <main className="home-shell">
      <section className="home-hero" data-mega="ACHMAGE">
        <div className="home-hero__eyebrow">Markdown Source-of-Truth</div>
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
          Current source:{' '}
          <code>{selectedVaultPath ?? 'No vault selected yet'}</code>
        </p>
        <div className="home-card__links">
          <button className="home-search__clear" type="button" onClick={onSelectVault}>
            {selectedVaultPath ? 'Switch vault' : 'Select vault'}
          </button>
          {selectedVaultPath ? (
            <button className="home-search__clear" type="button" onClick={onRescan}>
              Rescan vault
            </button>
          ) : null}
        </div>
      </section>

      <section className="home-list">
        <div className="home-list__toolbar">
          <div className="home-list__heading">
            <div className="home-list__eyebrow">Document Workbench</div>
            <h2>{selectedVaultPath ? 'Vault Documents' : 'Bundled Preview Documents'}</h2>
          </div>
          <p className="home-list__status">
            {docs.length} docs / {active ? results.length : docs.length} shown
          </p>
          <div className="home-search">
            <label className="home-search__field">
              <span className="home-search__label">Omnisearch</span>
              <input
                className="home-search__input"
                type="search"
                value={searchState.query}
                placeholder="제목, 본문, YAML, #태그를 통합 검색"
                onChange={(event) => onSearchStateChange({...searchState, query: event.currentTarget.value})}
              />
            </label>
            <div className="home-search__bar">
              <div className="home-search__actions">
                <p className="home-search__hint">
                  Use <code>#tag</code>, <code>AND</code>, <code>OR</code>. Example: <code>AI AND #lecture</code>
                </p>
                {active ? (
                  <button
                    className="home-search__clear"
                    type="button"
                    onClick={() => onSearchStateChange({query: '', tags: []})}
                  >
                    Clear filters
                  </button>
                ) : null}
              </div>
              {active ? (
                <div className="home-search__feedback">
                  <p className="home-search__feedback-copy">
                    {parsedQuery.hasOr
                      ? 'OR groups active.'
                      : parsedQuery.terms.length > 1
                        ? 'AND search active.'
                        : 'Single-term search active.'}
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

        {selectedVaultPath ? (
          <div className="home-search__feedback">
            <p className="home-search__feedback-copy">Top tags</p>
            <div className="home-search__feedback-chips">
              {tagCounts.slice(0, 10).map((tag) => (
                <button
                  key={tag.tag}
                  className={`home-search__feedback-chip${searchState.tags.includes(tag.tag) ? ' home-search__feedback-chip--query' : ''}`}
                  type="button"
                  onClick={() =>
                    onSearchStateChange({
                      ...searchState,
                      tags: searchState.tags.includes(tag.tag)
                        ? searchState.tags.filter((entry) => entry !== tag.tag)
                        : [...searchState.tags, tag.tag],
                    })
                  }
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
              Clear filters
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
                {match ? <div className="home-card__match">Matched in: {match.matchedFields.join(' / ')}</div> : null}
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
                  {doc.meta.outputs.map((output) => (
                    <button
                      key={`${doc.slug}-${output}`}
                      className="home-search__clear"
                      type="button"
                      onClick={() => onOpenDoc(output, doc.slug)}
                    >
                      {output}
                    </button>
                  ))}
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {loading ? <p className="home-search__hint">Vault snapshot을 다시 불러오는 중입니다...</p> : null}
    </main>
  );
}
