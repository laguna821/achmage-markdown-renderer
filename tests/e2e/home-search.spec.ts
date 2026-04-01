import {expect, test} from '@playwright/test';

test('home omnisearch filters by title, body, and YAML then restores the default list', async ({page}) => {
  await page.goto('/');

  const input = page.locator('[data-home-search-input]');
  await expect(input).toBeVisible();
  await input.click();
  await input.fill('AI 리터러시');

  const titleCard = page.locator('article[data-home-card="home-search-title"]').first();
  const bodyCard = page.locator('article[data-home-card="home-search-body"]').first();
  const yamlCard = page.locator('article[data-home-card="home-search-frontmatter"]').first();
  const controlCard = page.locator('article[data-home-card="home-search-control"]').first();
  const visibleSuiteCards = page.locator('article[data-home-card^="home-search-"]:not([hidden])');

  await expect(titleCard).toBeVisible();
  await expect(bodyCard).toBeVisible();
  await expect(yamlCard).toBeVisible();
  await expect(controlCard).toBeHidden();
  await expect(visibleSuiteCards).toHaveCount(3);

  await input.press('Escape');
  await expect(controlCard).toBeVisible();
  await expect(visibleSuiteCards).toHaveCount(4);
});

test('home omnisearch supports AND with hashtag terms', async ({page}) => {
  await page.goto('/');

  const input = page.locator('[data-home-search-input]');
  await input.fill('AI AND #home-search-alpha');

  await expect(page.locator('article[data-home-card="home-search-title"]').first()).toBeVisible();
  await expect(page.locator('article[data-home-card="home-search-body"]').first()).toBeVisible();
  await expect(page.locator('article[data-home-card="home-search-frontmatter"]').first()).toBeHidden();
  await expect(page.locator('article[data-home-card="home-search-control"]').first()).toBeHidden();

  const feedback = page.locator('[data-home-search-feedback-copy]');
  await expect(feedback).toContainText('AND search active');
});

test('home omnisearch supports OR logic and shows matched tag chips on cards', async ({page}) => {
  await page.goto('/');

  const input = page.locator('[data-home-search-input]');
  await input.fill('#home-search-alpha OR #home-search-beta');

  const visibleSuiteCards = page.locator('article[data-home-card^="home-search-"]:not([hidden])');
  await expect(visibleSuiteCards).toHaveCount(4);
  await expect(page.locator('[data-home-search-feedback-copy]')).toContainText('OR groups active');

  const titleCardTags = page
    .locator('article[data-home-card="home-search-title"] [data-home-card-active-tags]')
    .first();
  await expect(titleCardTags).toContainText('#home-search-alpha');
});

test('home omnisearch keeps legacy URL tag filters working', async ({page}) => {
  await page.goto('/?q=AI&tags=home-search-beta');

  const input = page.locator('[data-home-search-input]');
  await expect(input).toHaveValue('AI');

  await expect(page.locator('article[data-home-card="home-search-frontmatter"]').first()).toBeVisible();
  await expect(page.locator('article[data-home-card="home-search-body"]').first()).toBeHidden();
  await expect(page.locator('article[data-home-card="home-search-title"]').first()).toBeHidden();
});
