import {expect, test} from '@playwright/test';

test('stage and reader routes expose Pretext targets and QA state', async ({page}) => {
  await page.goto('/reader/lecture-basic');

  await expect(page.locator('[data-pretext="balance-title"]').first()).toBeVisible();
  await expect(page.locator('[data-pretext="shrink-wrap"]').first()).toBeVisible();

  const readerQa = await page.evaluate(() => (window as Window & {__ACHMAGE_PRETEXT_QA__?: unknown[]}).__ACHMAGE_PRETEXT_QA__);
  expect(Array.isArray(readerQa)).toBe(true);

  await page.goto('/stage/pretext-lab');
  await expect(page.locator('[data-pretext-stage-hero]')).toHaveCount(1);
  await expect(page.locator('[data-pretext-section-cover]').first()).toHaveCount(1);

  const fitClass = await page.locator('[data-pretext-stage-hero]').getAttribute('data-stage-fit');
  expect(['stage-fit-ok', 'stage-fit-tight', 'stage-fit-overflow']).toContain(fitClass);
});

test('newsletter route exposes cover tuning, wrap figure surfaces, and axis-table mobile fallback', async ({page}) => {
  await page.setViewportSize({width: 390, height: 844});
  await page.goto('/newsletter/newsletter-pretext-lab');

  await expect(page.locator('[data-pretext-newsletter-cover="true"]')).toHaveCount(1);
  await expect(page.locator('[data-pretext-wrap-figure="true"]')).toHaveCount(1);

  const tableWrap = page.locator('[data-pretext-axis-table]').first();
  await expect(tableWrap).toHaveAttribute('data-axis-table-view', /table|cards/);
  await expect(page.locator('.axis-table-cards')).toHaveCount(1);

  const qa = await page.evaluate(() => (window as Window & {__ACHMAGE_PRETEXT_QA__?: Array<{code: string}>}).__ACHMAGE_PRETEXT_QA__ ?? []);
  expect(qa.some((finding) => finding.code === 'AXIS_TABLE_MOBILE_RISK')).toBe(true);
});

test('rich pretext route keeps canonical DOM while rendering manual rich lines', async ({page}) => {
  await page.goto('/reader/rich-pretext-lab');

  const activeRichBlocks = page.locator('[data-pretext-manual-lines="true"][data-pretext-rich-active="true"]');
  await expect(activeRichBlocks).toHaveCount(3);
  await expect(page.locator('[data-pretext-rich-overlay="true"] .pretext-rich-line').first()).toBeVisible();
  await expect(page.locator('[data-pretext-rich-source="true"] strong').first()).toBeAttached();
  await expect(page.locator('[data-pretext-rich-source="true"] code').first()).toBeAttached();
});

test('reader note routes keep thesis and quote blocks out of shrink-wrap mode', async ({page}) => {
  await page.goto('/reader/note-thesis-lab');

  await expect(page.locator('.thesis-block')).toHaveCount(1);
  await expect(page.locator('.doc-quote')).toHaveCount(1);
  await expect(page.locator('.thesis-block [data-pretext]')).toHaveCount(0);
  await expect(page.locator('.doc-quote [data-pretext]')).toHaveCount(0);
});
