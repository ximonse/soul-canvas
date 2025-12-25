// src/utils/imageCache.ts
// Simple image cache with a small concurrency limit to avoid load spikes.

type CacheEntry =
  | { status: 'loading'; promise: Promise<HTMLImageElement> }
  | { status: 'loaded'; image: HTMLImageElement }
  | { status: 'error' };

const imageCache = new Map<string, CacheEntry>();
const MAX_CONCURRENT_LOADS = 6;
const pendingQueue: Array<{
  url: string;
  resolve: (img: HTMLImageElement) => void;
  reject: (error: Error) => void;
}> = [];
let activeLoads = 0;

const pumpQueue = () => {
  while (activeLoads < MAX_CONCURRENT_LOADS && pendingQueue.length > 0) {
    const next = pendingQueue.shift();
    if (!next) return;
    activeLoads += 1;
    const img = new window.Image();
    img.decoding = 'async';
    img.onload = () => {
      imageCache.set(next.url, { status: 'loaded', image: img });
      next.resolve(img);
      activeLoads -= 1;
      pumpQueue();
    };
    img.onerror = () => {
      imageCache.set(next.url, { status: 'error' });
      next.reject(new Error(`Failed to load image: ${next.url}`));
      activeLoads -= 1;
      pumpQueue();
    };
    img.src = next.url;
  }
};

export const loadCachedImage = (url: string): Promise<HTMLImageElement> => {
  const cached = imageCache.get(url);
  if (cached?.status === 'loaded') {
    return Promise.resolve(cached.image);
  }
  if (cached?.status === 'loading') {
    return cached.promise;
  }
  if (cached?.status === 'error') {
    imageCache.delete(url);
  }

  let resolveFn: (img: HTMLImageElement) => void;
  let rejectFn: (error: Error) => void;
  const promise = new Promise<HTMLImageElement>((resolve, reject) => {
    resolveFn = resolve;
    rejectFn = reject;
  });

  imageCache.set(url, { status: 'loading', promise });
  pendingQueue.push({ url, resolve: resolveFn!, reject: rejectFn! });
  pumpQueue();
  return promise;
};
