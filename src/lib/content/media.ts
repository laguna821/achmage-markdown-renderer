export type MediaEmbed =
  | {
      provider: 'youtube';
      url: string;
      title: string;
      videoId: string;
      embedUrl: string;
    };

const normalizeUrl = (value: string): URL | null => {
  try {
    return new URL(value);
  } catch {
    return null;
  }
};

const extractYouTubeVideoId = (value: string): string | null => {
  const url = normalizeUrl(value);
  if (!url) {
    return null;
  }

  const host = url.hostname.replace(/^www\./i, '').toLowerCase();

  if (host === 'youtu.be') {
    const id = url.pathname.replace(/^\/+/, '').split('/')[0];
    return id || null;
  }

  if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'youtube-nocookie.com') {
    const queryId = url.searchParams.get('v');
    if (queryId) {
      return queryId;
    }

    const segments = url.pathname.split('/').filter(Boolean);
    const embedIndex = segments.findIndex((segment) => segment === 'embed' || segment === 'shorts' || segment === 'live');
    if (embedIndex >= 0) {
      return segments[embedIndex + 1] ?? null;
    }
  }

  return null;
};

export const resolveMediaEmbed = (url: string, title?: string): MediaEmbed | null => {
  const videoId = extractYouTubeVideoId(url);
  if (videoId) {
    return {
      provider: 'youtube',
      url,
      title: title?.trim() || 'YouTube video',
      videoId,
      embedUrl: `https://www.youtube-nocookie.com/embed/${videoId}`,
    };
  }

  return null;
};
