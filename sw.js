/* WorkBuddy Service Worker：离线缓存核心资源 */
const CACHE = 'workbuddy-v1';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './css/style.css',
  './js/data.js',
  './js/reader.js',
  './js/tasks.js',
  './js/generator.js',
  './js/app.js',
  './js/lib/pdf.min.js',
  './js/lib/pdf.worker.min.js',
  './js/lib/mammoth.browser.min.js'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  // 只缓存同源静态资源，网络请求（搜索链接等）不拦截
  const url = new URL(e.request.url);
  if (url.origin !== self.location.origin) return;
  e.respondWith(
    caches.match(e.request).then((hit) => hit || fetch(e.request))
  );
});
