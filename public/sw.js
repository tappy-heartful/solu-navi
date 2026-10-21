// Solu Navi Service Worker (v5: キャッシュ戦略刷新 - _next配下を完全除外 & localhost自動バイパス)
const CACHE_NAME = "solu-navi-cache-v5";

// プリキャッシュ対象の完全静的アセット（HTML/ページ/JSバンドルは含めない）
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

  // 2. ローカル開発環境 (localhost / 127.0.0.1) では一切キャッシュ処理を行わない
  if (
    url.hostname === "localhost" ||
    url.hostname === "127.0.0.1" ||
    url.hostname === "[::1]"
  ) {
    return;
  }

  // 3. API、Firebase、LINE関連、Next.js内部コード (_next/*) は絶対にキャッシュしない
  //    (JS/CSSチャンクはブラウザの標準HTTPキャッシュに任せ、SWによるキャッシュ事故を防止)
  if (
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/_next/") ||
    url.hostname.includes("firestore.googleapis.com") ||
    url.hostname.includes("identitytoolkit.googleapis.com") ||
    url.hostname.includes("line.me") ||
    url.hostname.includes("profile.line-scdn.net")
  ) {
    return;
  }

  // 4. 静的画像・アイコン・マニフェストのみキャッシュ対象 (Cache First)
  const isStaticMedia =
    url.pathname.startsWith("/icons/") ||
    url.pathname.endsWith(".png") ||
    url.pathname.endsWith(".jpg") ||
    url.pathname.endsWith(".ico") ||
    url.pathname.endsWith(".svg") ||
    url.pathname.endsWith(".webmanifest") ||
    url.pathname === "/manifest.json";

  if (isStaticMedia) {
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

  // 5. HTML・ページナビゲーション・RSCデータ・その他動的リクエスト:
  //    キャッシュに保存せず常にネットワークから最新データを取得 (Network Only)
  return;
});
