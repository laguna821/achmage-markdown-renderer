import {
  highlightHomeSearchText,
  parseHomeSearchExpression,
  parseHomeSearchState,
  prepareHomeSearchEntries,
  searchPreparedHomeEntries,
  serializeHomeSearchState,
  type HomeSearchPayload,
  type HomeSearchQueryTerm,
  type HomeSearchResult,
} from './home-search';

type CardRecord = {
  element: HTMLElement;
  title: HTMLElement | null;
  summary: HTMLElement | null;
  searchMeta: HTMLElement | null;
  activeTags: HTMLElement | null;
  excerpt: HTMLElement | null;
  originalTitle: string;
  originalSummary: string;
};

const renderFieldLabel = (result: HomeSearchResult): string => {
  const labels = result.matchedFields.map((field) => {
    switch (field) {
      case 'title':
        return 'Title';
      case 'summary':
        return 'Summary';
      case 'yaml':
        return 'YAML';
      case 'body':
        return 'Body';
      case 'tag':
        return 'Tag';
      default:
        return field;
    }
  });

  return labels.length > 0 ? `Matched in: ${labels.join(' / ')}` : 'Matched';
};

const formatTagLabel = (tag: string): string => `#${tag}`;

const renderStaticChips = (container: HTMLElement, values: readonly string[], className: string): void => {
  container.replaceChildren();

  values.forEach((value) => {
    const chip = document.createElement('span');
    chip.className = className;
    chip.textContent = value;
    container.append(chip);
  });
};

const describeTerm = (term: HomeSearchQueryTerm): string =>
  term.kind === 'tag' ? formatTagLabel(term.normalized) : term.raw;

const clearCardSearchState = (card: CardRecord): void => {
  if (card.title) {
    card.title.textContent = card.originalTitle;
  }

  if (card.summary) {
    card.summary.textContent = card.originalSummary;
  }

  if (card.searchMeta) {
    card.searchMeta.hidden = true;
    card.searchMeta.textContent = '';
  }

  if (card.activeTags) {
    card.activeTags.hidden = true;
    card.activeTags.replaceChildren();
  }

  if (card.excerpt) {
    card.excerpt.hidden = true;
    card.excerpt.innerHTML = '';
  }
};

export const initHomeSearch = (root: HTMLElement): void => {
  const controls = root.querySelector<HTMLElement>('[data-home-search-controls]');
  const input = root.querySelector<HTMLInputElement>('[data-home-search-input]');
  const status = root.querySelector<HTMLElement>('[data-home-search-status]');
  const grid = root.querySelector<HTMLElement>('[data-home-search-grid]');
  const emptyState = root.querySelector<HTMLElement>('[data-home-search-empty]');
  const clearButtons = Array.from(root.querySelectorAll<HTMLButtonElement>('[data-home-search-clear]'));
  const feedback = root.querySelector<HTMLElement>('[data-home-search-feedback]');
  const feedbackCopy = root.querySelector<HTMLElement>('[data-home-search-feedback-copy]');
  const feedbackChips = root.querySelector<HTMLElement>('[data-home-search-feedback-chips]');
  const totalDocs = Number(root.getAttribute('data-home-search-total') ?? '0');
  const searchIndexUrl = root.getAttribute('data-home-search-url');

  if (!controls || !input || !status || !grid || !emptyState || !searchIndexUrl) {
    return;
  }

  controls.hidden = false;

  const cards = Array.from(root.querySelectorAll<HTMLElement>('[data-home-card]')).map((element) => ({
    element,
    title: element.querySelector<HTMLElement>('[data-home-card-title]'),
    summary: element.querySelector<HTMLElement>('[data-home-card-summary]'),
    searchMeta: element.querySelector<HTMLElement>('[data-home-card-match]'),
    activeTags: element.querySelector<HTMLElement>('[data-home-card-active-tags]'),
    excerpt: element.querySelector<HTMLElement>('[data-home-card-excerpt]'),
    originalTitle: element.querySelector<HTMLElement>('[data-home-card-title]')?.textContent?.trim() ?? '',
    originalSummary: element.querySelector<HTMLElement>('[data-home-card-summary]')?.textContent?.trim() ?? '',
  }));

  const cardMap = new Map(cards.map((card) => [card.element.getAttribute('data-home-card') ?? '', card]));
  const initialState = parseHomeSearchState(window.location.search);
  const selectedTags = new Set<string>(initialState.tags);
  let preparedEntries: ReturnType<typeof prepareHomeSearchEntries> | null = null;
  let loadingPromise: Promise<void> | null = null;
  let composing = false;
  let debounceId = 0;

  input.value = initialState.query;
  status.textContent = `${totalDocs} docs / ${totalDocs} shown`;

  const syncUrl = (): void => {
    const nextUrl = serializeHomeSearchState({
      query: input.value,
      tags: [...selectedTags],
    });
    window.history.replaceState(null, '', nextUrl || window.location.pathname);
  };

  const renderFeedbackState = (): void => {
    if (!feedback || !feedbackCopy || !feedbackChips) {
      return;
    }

    const parsed = parseHomeSearchExpression(input.value);
    const legacyTags = [...selectedTags];
    const active = parsed.terms.length > 0 || legacyTags.length > 0;

    feedback.hidden = !active;

    if (!active) {
      feedbackCopy.textContent = '';
      feedbackChips.replaceChildren();
      return;
    }

    if (parsed.hasOr) {
      feedbackCopy.textContent = 'OR groups active. Terms inside one group are treated as AND.';
    } else if (parsed.terms.length > 1) {
      feedbackCopy.textContent = 'AND search active. Every term in the query must match.';
    } else if (parsed.terms.length === 1) {
      feedbackCopy.textContent = 'Single-term search active.';
    } else {
      feedbackCopy.textContent = 'Legacy tag filter active.';
    }

    const chips = parsed.terms.map(describeTerm).concat(legacyTags.map(formatTagLabel));
    renderStaticChips(feedbackChips, chips, 'home-search__feedback-chip');
  };

  const applyCards = (results: HomeSearchResult[]): void => {
    const active = input.value.trim().length > 0 || selectedTags.size > 0;

    renderFeedbackState();

    clearButtons.forEach((button) => {
      button.hidden = !active;
    });

    cards.forEach((card) => {
      clearCardSearchState(card);
      card.element.hidden = active;
    });

    if (!active) {
      cards.forEach((card) => {
        card.element.hidden = false;
        grid.append(card.element);
      });
      emptyState.hidden = true;
      status.textContent = `${totalDocs} docs / ${totalDocs} shown`;
      return;
    }

    if (results.length === 0) {
      emptyState.hidden = false;
      status.textContent = `${totalDocs} docs / 0 shown`;
      return;
    }

    emptyState.hidden = true;
    status.textContent = `${totalDocs} docs / ${results.length} shown`;

    results.forEach((result) => {
      const card = cardMap.get(result.entry.slug);
      if (!card) {
        return;
      }

      card.element.hidden = false;
      grid.append(card.element);

      if (card.searchMeta) {
        card.searchMeta.hidden = false;
        card.searchMeta.textContent = renderFieldLabel(result);
      }

      if (card.excerpt && result.excerpt && input.value.trim()) {
        card.excerpt.hidden = false;
        card.excerpt.innerHTML = highlightHomeSearchText(result.excerpt, input.value);
      }

      if (card.activeTags && result.matchedTags.length > 0) {
        card.activeTags.hidden = false;
        renderStaticChips(
          card.activeTags,
          result.matchedTags.map(formatTagLabel),
          'home-card__tag-chip',
        );
      }
    });
  };

  const loadIndex = async (): Promise<void> => {
    if (preparedEntries) {
      return;
    }

    if (!loadingPromise) {
      loadingPromise = fetch(searchIndexUrl, {headers: {accept: 'application/json'}})
        .then((response) => {
          if (!response.ok) {
            throw new Error(`Failed to load search index: ${response.status}`);
          }

          return response.json() as Promise<HomeSearchPayload>;
        })
        .then((payload) => {
          preparedEntries = prepareHomeSearchEntries(payload.entries);
        })
        .finally(() => {
          loadingPromise = null;
        });
    }

    await loadingPromise;
  };

  const runSearch = async (): Promise<void> => {
    await loadIndex();
    if (!preparedEntries) {
      return;
    }

    const results = searchPreparedHomeEntries(preparedEntries, {
      query: input.value,
      tags: [...selectedTags],
    });

    applyCards(results);
    syncUrl();
  };

  const scheduleSearch = (): void => {
    window.clearTimeout(debounceId);
    debounceId = window.setTimeout(() => {
      void runSearch();
    }, 120);
  };

  input.addEventListener('focus', () => {
    void loadIndex();
  });
  input.addEventListener('compositionstart', () => {
    composing = true;
  });
  input.addEventListener('compositionend', () => {
    composing = false;
    scheduleSearch();
  });
  input.addEventListener('input', () => {
    if (!composing) {
      scheduleSearch();
    }
  });
  input.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      input.value = '';
      selectedTags.clear();
      scheduleSearch();
    }
  });

  clearButtons.forEach((button) => {
    button.addEventListener('click', async () => {
      input.value = '';
      selectedTags.clear();
      await runSearch();
    });
  });

  window.addEventListener('keydown', (event) => {
    const target = event.target as HTMLElement | null;
    const editable =
      target instanceof HTMLInputElement ||
      target instanceof HTMLTextAreaElement ||
      target?.isContentEditable;

    if (event.key === '/' && !event.metaKey && !event.ctrlKey && !event.altKey && !editable) {
      event.preventDefault();
      input.focus();
      void loadIndex();
    }
  });

  window.addEventListener('popstate', () => {
    const nextState = parseHomeSearchState(window.location.search);
    input.value = nextState.query;
    selectedTags.clear();
    nextState.tags.forEach((tag) => selectedTags.add(tag));
    if (preparedEntries) {
      const results = searchPreparedHomeEntries(preparedEntries, nextState);
      applyCards(results);
    } else if (!nextState.query && nextState.tags.length === 0) {
      applyCards([]);
    } else {
      void runSearch();
    }
  });

  if (initialState.query || initialState.tags.length > 0) {
    void runSearch();
  }
};
