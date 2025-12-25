// src/utils/imageCache.ts
// Simple image cache to avoid repeated Image() allocations/loads.

type CacheEntry =
  | { status: 'loading'; promise: Promise<HTMLImageElement> }
  | { status: 'loaded'; image: HTMLImageElement }
  | { status: 'error' };

const imageCache = new Map<string, CacheEntry>();

export const loadCachedImage = (url: string): Promise<HTMLImageElement> => {
  const cached = imageCache.get(url);
  if (cached?.status === 'loaded') {
    return Promise.resolve(cached.image);
  }
  if (cached?.status === 'loading') {
    return cached.promise;
  }

  const img = new window.Image();
  const promise = new Promise<HTMLImageElement>((resolve, reject) => {
    img.onload = () => {
      imageCache.set(url, { status: 'loaded', image: img });
      resolve(img);
    };
    img.onerror = () => {
      imageCache.set(url, { status: 'error' });
      reject(new Error(`Failed to load image: ${url}`));
    };
  });

  imageCache.set(url, { status: 'loading', promise });
  img.src = url;
  return promise;
};
