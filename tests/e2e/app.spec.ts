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
