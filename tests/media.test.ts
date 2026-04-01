import {describe, expect, test} from 'vitest';

import {resolveMediaEmbed} from '../src/lib/content/media';

describe('resolveMediaEmbed', () => {
  test('detects youtu.be links and returns a privacy-friendly embed url', () => {
    expect(resolveMediaEmbed('https://youtu.be/72yb2-vqMSI?si=DbL4yuPU1f8qX1u1', 'Remotion 영상 링크')).toMatchObject({
      provider: 'youtube',
      videoId: '72yb2-vqMSI',
      embedUrl: 'https://www.youtube-nocookie.com/embed/72yb2-vqMSI',
      title: 'Remotion 영상 링크',
    });
  });

  test('returns null for ordinary image urls', () => {
    expect(resolveMediaEmbed('https://example.com/image.png', 'Image')).toBeNull();
  });
});
