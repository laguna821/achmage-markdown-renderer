import {expect, test} from '@playwright/test';

test('reader keeps wide media, callouts, and code blocks inside the main column', async ({page}) => {
  await page.setViewportSize({width: 1600, height: 900});
  await page.goto('/reader/overflow-lab');

  const overflow = await page.evaluate(() => {
    const main = document.querySelector('.layout-shell__main');
    if (!(main instanceof HTMLElement)) {
      return {missingMain: true};
    }

    const mainRect = main.getBoundingClientRect();
    const selectors = ['.image-block', '.prose-block', '.prose-block blockquote', '.prose-block pre', '.log-block'];
    const offenders = selectors.flatMap((selector) =>
      Array.from(document.querySelectorAll(selector)).flatMap((node) => {
        if (!(node instanceof HTMLElement)) {
          return [];
        }

        const rect = node.getBoundingClientRect();
        if (rect.right <= mainRect.right + 1) {
          return [];
        }

        return [
          {
            selector,
            right: Number(rect.right.toFixed(2)),
            mainRight: Number(mainRect.right.toFixed(2)),
            width: Number(rect.width.toFixed(2)),
            text: (node.textContent || '').trim().slice(0, 120),
          },
        ];
      }),
    );

    return {
      missingMain: false,
      offenders,
    };
  });

  expect(overflow).toMatchObject({missingMain: false});
  expect(overflow.offenders).toEqual([]);
});
