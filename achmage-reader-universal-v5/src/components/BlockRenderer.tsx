import {useEffect, useMemo, useRef, useState, type SyntheticEvent} from 'react';

import {resolveAxisTableLayoutHints, resolveBlockLayoutHints, buildPretextTargetAttributes} from '../core/pretext/hints';
import {resolveMediaEmbed} from '../core/content/media';
import type {NormalizedBlock, NormalizedDoc} from '../core/content';
import {readAssetDataUrl} from '../lib/bridge';

type Variant = 'reader' | 'stage' | 'newsletter';

type BlockRendererProps = {
  block: NormalizedBlock;
  variant: Variant;
  doc: NormalizedDoc;
  sectionId: string;
  blockIndex: number;
};

type HtmlProps = {
  html: string;
  className: string;
} & Record<string, string | undefined>;

function HtmlBlock({html, className, ...attrs}: HtmlProps) {
  return <div className={className} {...attrs} dangerouslySetInnerHTML={{__html: html}} />;
}

function ThesisBlock({content, variant}: {content: string; variant: Variant}) {
  return (
    <aside
      className={`thesis-block thesis-block--${variant}`}
      data-stage-block-kind={variant === 'stage' ? 'thesis' : undefined}
    >
      <div className="thesis-block__label">THESIS</div>
      <HtmlBlock html={content} className="thesis-block__content prose-block" />
    </aside>
  );
}

function DocQuoteBlock({content, variant}: {content: string; variant: Variant}) {
  return (
    <blockquote
      className={`doc-quote${variant === 'stage' ? ' doc-quote--stage' : ''}`}
      data-pretext-pull-quote={variant === 'newsletter' ? 'true' : undefined}
      data-stage-block-kind={variant === 'stage' ? 'docQuote' : undefined}
    >
      <HtmlBlock html={content} className="doc-quote__content prose-block" />
    </blockquote>
  );
}

function CalloutBlock({
  calloutType,
  title,
  content,
  variant,
}: {
  calloutType: string;
  title: string;
  content: string;
  variant: Variant;
}) {
  const normalizedType =
    calloutType
      .normalize('NFKC')
      .trim()
      .toLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, '-')
      .replace(/^-+|-+$/g, '') || 'note';
  const iconMap: Record<string, string> = {
    abstract: 'A',
    bug: '!',
    check: 'V',
    danger: '!',
    example: 'E',
    fail: '!',
    help: '?',
    important: '!',
    info: 'i',
    note: 'i',
    question: '?',
    quote: '"',
    success: 'V',
    summary: 'S',
    tip: '+',
    todo: 'T',
    warning: '!',
  };

  return (
    <aside
      className={`callout-block${variant === 'stage' ? ' callout-block--stage' : ''}`}
      data-callout-type={normalizedType}
      data-stage-block-kind={variant === 'stage' ? 'callout' : undefined}
    >
      <div className="callout-block__title">
        <span className="callout-block__icon" aria-hidden="true">
          {iconMap[normalizedType] ?? 'i'}
        </span>
        <span className="callout-block__title-text">{title}</span>
      </div>
      <HtmlBlock html={content} className="callout-block__body prose-block" />
    </aside>
  );
}

type StageImageShape = 'unknown' | 'landscape' | 'portrait' | 'square';

const resolveStageImageShape = (width: number, height: number): StageImageShape => {
  if (width <= 0 || height <= 0) {
    return 'unknown';
  }

  const ratio = width / height;
  if (ratio >= 1.08) {
    return 'landscape';
  }

  if (ratio <= 0.92) {
    return 'portrait';
  }

  return 'square';
};

function ImageBlock({
  src,
  alt,
  caption,
  doc,
  variant,
}: {
  src: string;
  alt?: string;
  caption?: string;
  doc: NormalizedDoc;
  variant: Variant;
}) {
  const embed = useMemo(() => resolveMediaEmbed(src, alt ?? caption), [alt, caption, src]);
  const [resolvedSrc, setResolvedSrc] = useState(src);
  const [stageImageShape, setStageImageShape] = useState<StageImageShape>('unknown');
  const imageRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    let cancelled = false;

    if (/^(https?:)?\/\//i.test(src) || src.startsWith('data:') || src.startsWith('/')) {
      setResolvedSrc(src);
      return () => {
        cancelled = true;
      };
    }

    void readAssetDataUrl(doc.sourceRoot, doc.filePath, src)
      .then((nextSrc) => {
        if (!cancelled) {
          setResolvedSrc(nextSrc);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setResolvedSrc(src);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [doc.filePath, doc.sourceRoot, src]);

  useEffect(() => {
    if (variant !== 'stage') {
      return;
    }

    setStageImageShape('unknown');
  }, [resolvedSrc, variant]);

  const captionText = caption ?? alt;
  const syncStageImageShape = (image: HTMLImageElement | null) => {
    if (variant !== 'stage' || !image) {
      return;
    }

    const width = image.naturalWidth || image.width;
    const height = image.naturalHeight || image.height;
    if (width > 0 && height > 0) {
      setStageImageShape(resolveStageImageShape(width, height));
    }
  };

  const onStageImageLoad = (event: SyntheticEvent<HTMLImageElement>) => {
    syncStageImageShape(event.currentTarget);
  };

  useEffect(() => {
    syncStageImageShape(imageRef.current);
  }, [resolvedSrc, variant]);

  if (embed) {
    return (
      <figure className="image-block embed-block" data-embed-provider={embed.provider}>
        <div className="embed-block__frame">
          <iframe
            src={embed.embedUrl}
            title={embed.title}
            loading="lazy"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
          />
        </div>
        <figcaption className="embed-block__caption">
          <a href={embed.url} target="_blank" rel="noreferrer">
            {embed.title}
          </a>
        </figcaption>
      </figure>
    );
  }

  if (variant === 'stage') {
    return (
      <figure className="image-block image-block--stage" data-stage-image-shape={stageImageShape}>
        <div className="image-block__stage-viewport" data-stage-image-viewport="true">
          <img ref={imageRef} src={resolvedSrc} alt={alt ?? ''} loading="lazy" onLoad={onStageImageLoad} />
        </div>
        {captionText ? <figcaption className="image-block__caption image-block__caption--stage">{captionText}</figcaption> : null}
      </figure>
    );
  }

  return (
    <figure className="image-block">
      <img src={resolvedSrc} alt={alt ?? ''} loading="lazy" />
      {captionText ? <figcaption>{captionText}</figcaption> : null}
    </figure>
  );
}

function AxisTable({
  headers,
  rows,
  variant,
  doc,
  sectionId,
  blockIndex,
}: {
  headers: string[];
  rows: string[][];
  variant: Variant;
  doc: NormalizedDoc;
  sectionId: string;
  blockIndex: number;
}) {
  const hasPretext = resolveAxisTableLayoutHints(variant, doc.meta).length > 0;

  return (
    <div
      className={`axis-table__wrap${variant === 'stage' ? ' axis-table__wrap--stage' : ''}`}
      data-pretext-axis-table={hasPretext ? 'true' : undefined}
      data-pretext-section-id={hasPretext ? sectionId : undefined}
      data-pretext-block-index={hasPretext ? String(blockIndex) : undefined}
      data-axis-table-view="table"
      data-stage-block-kind={variant === 'stage' ? 'axisTable' : undefined}
    >
      <table className="axis-table">
        <thead>
          <tr>
            {headers.map((header, index) => (
              <th
                key={`${header}-${index}`}
                className={`axis-table__head${index === 0 ? ' axis-table__head--axis' : ''}`}
                dangerouslySetInnerHTML={{__html: header}}
              />
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={`row-${rowIndex}`}>
              {row.map((cell, cellIndex) => (
                <td
                  key={`cell-${rowIndex}-${cellIndex}`}
                  className={`axis-table__cell${cellIndex === 0 ? ' axis-table__cell--axis' : ''}`}
                  dangerouslySetInnerHTML={{__html: cell}}
                />
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="axis-table-cards">
        {rows.map((row, rowIndex) => (
          <article key={`card-${rowIndex}`} className="axis-table-card">
            <h3 className="axis-table-card__title" dangerouslySetInnerHTML={{__html: row[0] ?? headers[0] ?? 'Axis'}} />
            <dl className="axis-table-card__grid">
              {row.slice(1).map((cell, index) => (
                <div key={`card-cell-${rowIndex}-${index}`}>
                  <dt dangerouslySetInnerHTML={{__html: headers[index + 1] ?? `Column ${index + 2}`}} />
                  <dd dangerouslySetInnerHTML={{__html: cell}} />
                </div>
              ))}
            </dl>
          </article>
        ))}
      </div>
    </div>
  );
}

function EvidenceGrid({
  items,
  variant,
  doc,
  sectionId,
  blockIndex,
}: {
  items: Array<{id?: string; title: string; body: string; tag?: string}>;
  variant: Variant;
  doc: NormalizedDoc;
  sectionId: string;
  blockIndex: number;
}) {
  const [hint] = resolveBlockLayoutHints('evidenceGrid', variant, doc.meta);
  const pretextAttributes = hint
    ? buildPretextTargetAttributes({
        slug: doc.slug,
        hint,
        keySuffix: `section:${sectionId}:block:${blockIndex}:evidence-grid`,
        extras: {
          'data-pretext-section-id': sectionId,
          'data-pretext-block-index': String(blockIndex),
        },
      })
    : {};

  return (
    <section
      className={`evidence-grid${variant === 'newsletter' ? ' evidence-grid--newsletter' : ''}${variant === 'stage' ? ' evidence-grid--stage' : ''}`}
      data-stage-block-kind={variant === 'stage' ? 'evidenceGrid' : undefined}
      {...pretextAttributes}
    >
      {items.map((item) => (
        <article key={`${item.id ?? item.title}`} className="evidence-card">
          {item.tag ? <div className="evidence-card__tag">{item.tag}</div> : null}
          <h3 id={item.id} className="evidence-card__title">
            {item.title}
          </h3>
          <div className="evidence-card__body" dangerouslySetInnerHTML={{__html: item.body}} />
        </article>
      ))}
    </section>
  );
}

function EvidencePanel({
  item,
  variant,
}: {
  item: {id?: string; title: string; body: string; tag?: string};
  variant: Variant;
}) {
  return (
    <article
      className={`evidence-panel${variant === 'stage' ? ' evidence-panel--stage' : ''}`}
      data-stage-block-kind={variant === 'stage' ? 'evidencePanel' : undefined}
    >
      {item.tag ? <div className="evidence-panel__tag">{item.tag}</div> : null}
      <h3 id={item.id} className="evidence-panel__title">
        {item.title}
      </h3>
      <div className="evidence-panel__body" dangerouslySetInnerHTML={{__html: item.body}} />
    </article>
  );
}

function QuestionReset({
  items,
  variant,
}: {
  items: Array<{id?: string; title: string; body: string}>;
  variant: Variant;
}) {
  return (
    <section
      className={`question-reset${variant === 'stage' ? ' question-reset--stage' : ''}`}
      data-stage-block-kind={variant === 'stage' ? 'questionReset' : undefined}
    >
      {items.map((item, index) => (
        <article key={`${item.id ?? item.title}-${index}`} className="question-reset__card">
          <div className="question-reset__index">{index === 0 ? 'BEFORE' : 'REFRAME'}</div>
          <h3 id={item.id} className="question-reset__title">
            {item.title}
          </h3>
          <div className="question-reset__body" dangerouslySetInnerHTML={{__html: item.body}} />
        </article>
      ))}
    </section>
  );
}

function ProvenancePanel({ai, variant}: {ai: NonNullable<NormalizedDoc['meta']['ai']>; variant: Variant}) {
  return (
    <aside
      className={`provenance-panel${variant === 'stage' ? ' provenance-panel--stage' : ''}`}
      data-stage-block-kind={variant === 'stage' ? 'provenance' : undefined}
    >
      <div className="provenance-panel__eyebrow">AI PROVENANCE</div>
      <dl className="provenance-panel__grid">
        <div>
          <dt>Assisted</dt>
          <dd>{ai.assisted ? 'Yes' : 'No'}</dd>
        </div>
        {ai.model ? (
          <div>
            <dt>Model</dt>
            <dd>{ai.model}</dd>
          </div>
        ) : null}
        {ai.generatedAt ? (
          <div>
            <dt>Generated</dt>
            <dd>{ai.generatedAt}</dd>
          </div>
        ) : null}
        {ai.sourceConfidence ? (
          <div>
            <dt>Confidence</dt>
            <dd>{ai.sourceConfidence}</dd>
          </div>
        ) : null}
        {ai.basedOn && ai.basedOn.length > 0 ? (
          <div className="provenance-panel__sources">
            <dt>Sources</dt>
            <dd>{ai.basedOn.join(', ')}</dd>
          </div>
        ) : null}
      </dl>
    </aside>
  );
}

function LogBlock({language = 'log', code, variant}: {language?: string; code: string; variant: Variant}) {
  return (
    <section
      className={`log-block${variant === 'stage' ? ' log-block--stage' : ''}`}
      data-stage-block-kind={variant === 'stage' ? 'log' : undefined}
    >
      <div className="log-block__label">{language.toUpperCase()}</div>
      <pre>
        <code>{code}</code>
      </pre>
    </section>
  );
}

export function BlockRenderer({block, variant, doc, sectionId, blockIndex}: BlockRendererProps) {
  switch (block.kind) {
    case 'thesis':
      return <ThesisBlock content={block.content} variant={variant} />;
    case 'callout':
      return <CalloutBlock calloutType={block.calloutType} title={block.title} content={block.content} variant={variant} />;
    case 'questionReset':
      return <QuestionReset items={block.items} variant={variant} />;
    case 'evidenceGrid':
      return <EvidenceGrid items={block.items} variant={variant} doc={doc} sectionId={sectionId} blockIndex={blockIndex} />;
    case 'evidencePanel':
      return <EvidencePanel item={block.item} variant={variant} />;
    case 'axisTable':
      return <AxisTable headers={block.headers} rows={block.rows} variant={variant} doc={doc} sectionId={sectionId} blockIndex={blockIndex} />;
    case 'docQuote':
      return <DocQuoteBlock content={block.content} variant={variant} />;
    case 'log':
      return <LogBlock language={block.language} code={block.code} variant={variant} />;
    case 'provenance':
      return <ProvenancePanel ai={block.ai} variant={variant} />;
    case 'prose':
      return (
        <HtmlBlock
          html={block.html}
          className={`prose-block${variant === 'stage' ? ' prose-block--stage' : ''}`}
          data-stage-block-kind={variant === 'stage' ? 'prose' : undefined}
        />
      );
    case 'image':
      return <ImageBlock src={block.src} alt={block.alt} caption={block.caption} doc={doc} variant={variant} />;
    default:
      return null;
  }
}
