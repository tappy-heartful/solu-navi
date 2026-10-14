// Solu Navi Service Worker
const CACHE_NAME = "solu-navi-cache-v1";

// プリキャッシュ対象の静的アセット
const PRECACHE_ASSETS = [
  "/",
  "/manifest.json",
  "/sso-logo.jpg",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/icon-maskable-192.png",
  "/icons/icon-maskable-512.png",
  "/icons/apple-touch-icon.png",
  "/icons/favicon.png",
];

// インストール時
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(PRECACHE_ASSETS).catch((err) => {
          console.warn("[SW] Precache failed partly:", err);
        });
      })
      .then(() => self.skipWaiting())
  );
});

// アクティベート時（古いキャッシュを破棄）
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((name) => {
            if (name !== CACHE_NAME) {
              return caches.delete(name);
            }
          })
        );
      })
      .then(() => self.clients.claim())
  );
});

// リクエスト取得時
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // 1. GET 以外のリクエストはスルー
  if (request.method !== "GET") {
    return;
  }

  // 2. API リクエスト、Firebase、LINE関連、開発用ホットリロード (_next/webpack-hmr) はキャッシュせずネットワークへ
  if (
    url.pathname.startsWith("/api/") ||
    url.hostname.includes("firestore.googleapis.com") ||
    url.hostname.includes("identitytoolkit.googleapis.com") ||
    url.hostname.includes("line.me") ||
    url.hostname.includes("profile.line-scdn.net") ||
    url.pathname.includes("_next/webpack-hmr")
  ) {
    return;
  }

  // 3. 静的画像・アセット（キャッシュ優先）
  if (
    url.pathname.startsWith("/icons/") ||
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.endsWith(".png") ||
    url.pathname.endsWith(".jpg") ||
    url.pathname.endsWith(".ico")
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        });
      })
    );
    return;
  }

  // 4. 通常のページ遷移・HTML等（Network First: 最新情報を優先し、オフライン時のみキャッシュ）
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      })
      .catch(() => {
        return caches.match(request).then((cached) => {
          if (cached) return cached;
          // フォールバック（トップページ）
          return caches.match("/");
        });
      })
  );
});
