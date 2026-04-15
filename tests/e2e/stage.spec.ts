import {expect, test} from '@playwright/test';

test('home cards always expose a stage link and reader-only docs can open the universal stage route', async ({page}) => {
  await page.goto('/');

  const card = page.locator('[data-home-card="overflow-lab"]');
  await expect(card.locator('a[href="/stage/overflow-lab"]')).toHaveCount(1);

  await page.goto('/stage/overflow-lab');
  await expect(page.locator('[data-stage-root]')).toHaveCount(1);
  await expect(page.locator('[data-toc-scroll-root="desktop"]')).toHaveCount(0);
  await expect(page.locator('[data-mobile-toc-panel]')).toHaveCount(0);

  const geometry = await page.evaluate(() => {
    const header = document.querySelector('.site-header');
    const stage = document.querySelector('[data-stage-root]');
    if (!(header instanceof HTMLElement) || !(stage instanceof HTMLElement)) {
      return null;
    }

    const headerRect = header.getBoundingClientRect();
    const stageRect = stage.getBoundingClientRect();

    return {
      gap: Math.abs(stageRect.top - headerRect.bottom),
      height: stageRect.height,
      viewport: window.innerHeight,
    };
  });

  expect(geometry).not.toBeNull();
  expect(geometry?.gap ?? Infinity).toBeLessThanOrEqual(2);
  expect(geometry?.height ?? 0).toBeGreaterThan((geometry?.viewport ?? 0) * 0.6);
});

test('stage supports horizontal and vertical navigation inside the full-bleed shell', async ({page}) => {
  await page.goto('/stage/stage-navigation-lab');

  const root = page.locator('[data-stage-root]');
  await expect(root).toHaveAttribute('data-active-group', '0');
  await expect(root).toHaveAttribute('data-active-frame', '0');

  await page.keyboard.press('ArrowRight');
  await expect(root).toHaveAttribute('data-active-group', '1');
  await expect(root).toHaveAttribute('data-active-frame', '0');

  await page.keyboard.press('ArrowDown');
  await expect(root).toHaveAttribute('data-active-frame', '1');

  await page.keyboard.press('End');
  await expect(root).toHaveAttribute('data-active-group', '2');

  await page.keyboard.press('Home');
  await expect(root).toHaveAttribute('data-active-group', '0');
});

test('stage route preserves theme cycling and document theme overrides', async ({page}) => {
  await page.goto('/stage/overflow-lab');

  const root = page.locator('html');
  const toggle = page.locator('[data-theme-toggle]');

  await expect(root).toHaveAttribute('data-theme', 'light');
  await toggle.click();
  await expect(root).toHaveAttribute('data-theme', 'dark');
  await toggle.click();
  await expect(root).toHaveAttribute('data-theme', 'aurora');
  await toggle.click();
  await expect(root).toHaveAttribute('data-theme', 'cyber_sanctuary');
  await toggle.click();
  await expect(root).toHaveAttribute('data-theme', 'light');

  await page.goto('/stage/cyber-sanctuary-protocol');
  await expect(root).toHaveAttribute('data-theme', 'cyber_sanctuary');
});
