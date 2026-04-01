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

test('theme cycle rotates through light, dark, and aurora', async ({page}) => {
  await page.goto('/');

  const root = page.locator('html');
  const toggle = page.locator('[data-theme-toggle]');

  await expect(root).toHaveAttribute('data-theme', 'light');
  await expect(toggle.locator('[data-theme-label]')).toHaveText('LIGHT MODE');
  await expect(toggle.locator('[data-theme-state]')).toHaveText('1 / 3');

  await toggle.click();
  await expect(root).toHaveAttribute('data-theme', 'dark');
  await expect(toggle.locator('[data-theme-label]')).toHaveText('DARK MODE');
  await expect(toggle.locator('[data-theme-state]')).toHaveText('2 / 3');

  await toggle.click();
  await expect(root).toHaveAttribute('data-theme', 'aurora');
  await expect(toggle.locator('[data-theme-label]')).toHaveText('AURORA GLOW');
  await expect(toggle.locator('[data-theme-state]')).toHaveText('3 / 3');

  await toggle.click();
  await expect(root).toHaveAttribute('data-theme', 'light');
});
