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
        <div className="home-hero__eyebrow">Markdown Source-of-Truth</div>
        <h1>
          Record once,
          <br />
          render everywhere.
        </h1>
        <p className="home-hero__lede">
          One markdown vault can drive reader, stage, and newsletter outputs
          <br />
          without leaving the source-of-truth workflow.
        </p>
        <p className="home-hero__source">
          Current source: <code>{selectedVaultPath ?? 'No vault selected yet'}</code>
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
                placeholder="Search title, body, YAML, and #tags"
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

        {selectedVaultPath && searchIndex ? (
          <div className="home-search__feedback">
            <p className="home-search__feedback-copy">Top tags</p>
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
            <p>No documents matched the current filter.</p>
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

      {loading ? <p className="home-search__hint">Vault validation is still running...</p> : null}
    </main>
  );
}
