/// <reference types="@types/serviceworker" />

self.addEventListener('install', (ev: ExtendableEvent) => {
  ev.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (ev: ExtendableEvent) => {
  ev.waitUntil(self.clients.claim());
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
  
  return fetch(request);
}
