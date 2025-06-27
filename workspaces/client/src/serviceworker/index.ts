/// <reference types="@types/serviceworker" />

const CACHE_NAME = 'wsh-2024-cache-v1';
const STATIC_ASSETS = [
  '/assets/cyber-toon.svg',
  '/client.global.js',
];

self.addEventListener('install', (ev: ExtendableEvent) => {
  ev.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      await cache.addAll(STATIC_ASSETS);
      await self.skipWaiting();
    })()
  );
});

self.addEventListener('activate', (ev: ExtendableEvent) => {
  // キャッシュの古いバージョンを削除
  ev.waitUntil(
    (async () => {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener('fetch', (ev: FetchEvent) => {
  ev.respondWith(onFetch(ev.request));
});

async function onFetch(request: Request): Promise<Response> {
  const url = new URL(request.url);
  
  // JPEG XL画像のパラメータをサーバーサイドで変換できるWebP形式に変更
  if (url.pathname.startsWith('/images/') && url.pathname.endsWith('.jxl')) {
    const newUrl = new URL(url.toString());
    newUrl.searchParams.set('format', 'webp'); // サポートされている形式に変換
    return fetch(newUrl);
  }
  
  // 画像リソースのキャッシュ
  if (url.pathname.startsWith('/images/') || url.pathname.startsWith('/assets/')) {
    return cacheFirst(request);
  }
  
  // APIリクエスト
  if (url.pathname.startsWith('/api/')) {
    return networkFirst(request);
  }
  
  // その他のリソース
  return networkFirst(request);
}

// キャッシュファースト戦略（画像などの静的リソース向け）
async function cacheFirst(request: Request): Promise<Response> {
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    const networkResponse = await fetch(request);
    const cache = await caches.open(CACHE_NAME);
    // レスポンスをクローンしてキャッシュに保存（レスポンスは一度しか使えないため）
    cache.put(request, networkResponse.clone());
    return networkResponse;
  } catch (error) {
    // オフラインでネットワークエラーが発生した場合
    return new Response('Network error', { status: 408 });
  }
}

// ネットワークファースト戦略（APIや動的コンテンツ向け）
async function networkFirst(request: Request): Promise<Response> {
  try {
    const networkResponse = await fetch(request);
    const cache = await caches.open(CACHE_NAME);
    // レスポンスをクローンしてキャッシュに保存
    cache.put(request, networkResponse.clone());
    return networkResponse;
  } catch (error) {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    return new Response('Network error', { status: 408 });
  }
}
