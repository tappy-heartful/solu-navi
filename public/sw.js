// Solu Navi Service Worker (v4: キャッシュ戦略最適化 - HTML/動的データはキャッシュせず即時整合性を保証)
const CACHE_NAME = "solu-navi-cache-v4";

// プリキャッシュ対象の完全静的アセット（HTML/ページは含めない）
const PRECACHE_ASSETS = [
  "/manifest.json",
  "/favicon.ico",
  "/favicon.png",
  "/apple-touch-icon.png",
  "/sso-logo.jpg",
  "/default-avatar.svg",
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

// アクティベート時（古いバージョンのキャッシュを完全削除）
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((name) => {
            if (name !== CACHE_NAME) {
              console.log("[SW] Deleting old cache:", name);
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

  // 1. GET 以外のリクエストはそのままネットワークへ
  if (request.method !== "GET") {
    return;
  }

  // 2. API リクエスト、Firebase、LINE関連、開発用ホットリロード (_next/webpack-hmr) は一切キャッシュしない
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

  // 3. 静的画像・フォント・JSバンドル（Cache First: 静的アセットのみキャッシュして高速化）
  const isStaticAsset =
    url.pathname.startsWith("/icons/") ||
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.endsWith(".png") ||
    url.pathname.endsWith(".jpg") ||
    url.pathname.endsWith(".ico") ||
    url.pathname.endsWith(".svg") ||
    url.pathname.endsWith(".webmanifest") ||
    url.pathname === "/manifest.json";

  if (isStaticAsset) {
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

  // 4. HTML・ページナビゲーション・RSCデータ・動的リクエスト:
  // キャッシュに保存せず常にネットワークから最新データを取得 (Network Only)
  // これにより、データの削除・更新後に古いHTMLやデータが残留する問題を完全に防止
  return;
});
