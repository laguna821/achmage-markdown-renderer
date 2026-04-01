import {expect, test} from '@playwright/test';

test('reader renders youtube image syntax as an embed instead of a broken image', async ({page}) => {
  await page.goto('/reader/media-link-lab');

  const embed = page.locator('[data-embed-provider="youtube"]');
  await expect(embed).toHaveCount(1);
  await expect(embed.locator('iframe')).toHaveAttribute('src', /youtube-nocookie\.com\/embed\/72yb2-vqMSI/);
  await expect(embed.getByRole('link', {name: 'Remotion 영상 링크'})).toHaveAttribute('href', /youtu\.be\/72yb2-vqMSI/);

  await expect(page.locator('img[src*="youtu.be"], img[src*="youtube.com"]')).toHaveCount(0);
});
