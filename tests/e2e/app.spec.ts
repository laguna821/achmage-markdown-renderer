import {expect, test} from '@playwright/test';

test('reader route renders thesis and TOC', async ({page}) => {
  await page.goto('/reader/lecture-basic');
  await expect(page.getByText('THESIS')).toBeVisible();
  await expect(page.getByRole('link', {name: '관점 전환'})).toBeVisible();
});

test('mobile drawer can open and close', async ({page}) => {
  await page.setViewportSize({width: 390, height: 844});
  await page.goto('/reader/lecture-basic');
  const panel = page.locator('[data-mobile-toc-panel]');
  await page.getByRole('button', {name: 'Contents'}).click();
  await expect(panel).toBeVisible();
  await expect(panel.getByText('TABLE_OF_CONTENTS')).toBeVisible();
  await page.getByRole('button', {name: 'Close'}).click();
  await expect(panel).toBeHidden();
});

test('theme cycle rotates through light, dark, aurora, and cyber sanctuary', async ({page}) => {
  await page.goto('/');

  const root = page.locator('html');
  const toggle = page.locator('[data-theme-toggle]');

  await expect(root).toHaveAttribute('data-theme', 'light');
  await expect(toggle.locator('[data-theme-label]')).toHaveText('LIGHT MODE');
  await expect(toggle.locator('[data-theme-state]')).toHaveText('1 / 4');

  await toggle.click();
  await expect(root).toHaveAttribute('data-theme', 'dark');
  await expect(toggle.locator('[data-theme-label]')).toHaveText('DARK MODE');
  await expect(toggle.locator('[data-theme-state]')).toHaveText('2 / 4');

  await toggle.click();
  await expect(root).toHaveAttribute('data-theme', 'aurora');
  await expect(toggle.locator('[data-theme-label]')).toHaveText('AURORA GLOW');
  await expect(toggle.locator('[data-theme-state]')).toHaveText('3 / 4');

  await toggle.click();
  await expect(root).toHaveAttribute('data-theme', 'cyber_sanctuary');
  await expect(toggle.locator('[data-theme-label]')).toHaveText('CYBER SANCTUARY');
  await expect(toggle.locator('[data-theme-state]')).toHaveText('4 / 4');

  await toggle.click();
  await expect(root).toHaveAttribute('data-theme', 'light');
});

test('document frontmatter theme overrides stored selection', async ({page}) => {
  await page.addInitScript(() => {
    window.localStorage.setItem('achmage-theme', 'light');
  });

  await page.goto('/reader/cyber-sanctuary-protocol');

  const root = page.locator('html');
  const toggle = page.locator('[data-theme-toggle]');

  await expect(root).toHaveAttribute('data-theme', 'cyber_sanctuary');
  await expect(toggle.locator('[data-theme-label]')).toHaveText('CYBER SANCTUARY');
  await expect(toggle.locator('[data-theme-state]')).toHaveText('4 / 4');
});

test('toc keeps the current section highlighted while scrolling through deeper headings', async ({page}) => {
  await page.goto('/reader/lecture-basic');

  const currentSectionLink = page.getByRole('link', {name: '관점 전환'}).first();
  const nextSectionLink = page.getByRole('link', {name: '현장 노트'}).first();
  const nestedHeading = page.getByRole('heading', {name: '잘못된 질문', level: 3});

  await nestedHeading.evaluate((element) => {
    const top = element.getBoundingClientRect().top + window.scrollY;
    const activationLine = window.innerHeight * 0.2;
    window.scrollTo(0, Math.max(0, top - activationLine + 8));
  });

  await expect(currentSectionLink).toHaveClass(/is-active/);
  await expect(nextSectionLink).not.toHaveClass(/is-active/);
});

test('toc can activate the last section near the document bottom even when it cannot reach the top activation line', async ({
  page,
}) => {
  await page.goto('/reader/toc-bottom-lock');
  await page.evaluate(() => {
    window.scrollTo(0, document.documentElement.scrollHeight);
  });

  const lastHeading = page.getByRole('heading', {name: '추천 서브폴더', level: 2});
  const lastSectionLink = page.getByRole('link', {name: '추천 서브폴더'}).first();
  const stillBelowTheDefaultLine = await lastHeading.evaluate(
    (element) => element.getBoundingClientRect().top > window.innerHeight * 0.2,
  );

  expect(stillBelowTheDefaultLine).toBe(true);
  await expect(lastSectionLink).toHaveClass(/is-active/);
});

test('desktop toc rail auto-scrolls to keep the active entry visible for long tables of contents', async ({page}) => {
  await page.setViewportSize({width: 1440, height: 640});
  await page.goto('/reader/toc-scroll-follow');

  const rail = page.locator('[data-toc-scroll-root="desktop"]');
  const lastSectionLink = page.getByRole('link', {name: '섹션 24'}).first();
  const lastSectionHeading = page.locator('#섹션-24');

  await lastSectionHeading.evaluate((element) => {
    const top = element.getBoundingClientRect().top + window.scrollY;
    const activationLine = window.innerHeight * 0.2;
    const previousBehavior = document.documentElement.style.scrollBehavior;
    document.documentElement.style.scrollBehavior = 'auto';
    window.scrollTo(0, Math.max(0, top - activationLine + 8));
    document.documentElement.style.scrollBehavior = previousBehavior;
  });

  await expect(lastSectionLink).toHaveClass(/is-active/);

  await expect
    .poll(async () =>
      lastSectionLink.evaluate((element) => {
        const root = element.closest('[data-toc-scroll-root="desktop"]');
        if (!(root instanceof HTMLElement)) {
          return false;
        }

        const linkRect = element.getBoundingClientRect();
        const rootRect = root.getBoundingClientRect();
        return linkRect.top >= rootRect.top && linkRect.bottom <= rootRect.bottom;
      }),
    )
    .toBe(true);
});
