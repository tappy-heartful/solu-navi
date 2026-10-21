"use client";

import { useEffect } from "react";

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }

    const isLocalhost = Boolean(
      window.location.hostname === "localhost" ||
      window.location.hostname === "[::1]" ||
      window.location.hostname.match(/^127(?:\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)){3}$/)
    );

    // 開発環境 (localhost または NODE_ENV === 'development') の場合：
    // Service Worker を一切登録せず、既存の Service Worker とキャッシュストレージを自動で完全破棄する！
    if (process.env.NODE_ENV === "development" || isLocalhost) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        for (const registration of registrations) {
          registration.unregister().then((success) => {
            if (success) {
              console.log("[PWA Dev] Unregistered existing Service Worker:", registration.scope);
            }
          });
        }
      });

      if ("caches" in window) {
        caches.keys().then((cacheNames) => {
          for (const name of cacheNames) {
            caches.delete(name).then(() => {
              console.log("[PWA Dev] Cleared cache storage:", name);
            });
          }
        });
      }
      return;
    }

    // 本番環境のみ Service Worker を登録
    const registerSW = () => {
      navigator.serviceWorker
        .register("/sw.js")
        .then((registration) => {
          console.log("[PWA] Service Worker registered with scope:", registration.scope);

          registration.onupdatefound = () => {
            const installingWorker = registration.installing;
            if (installingWorker) {
              installingWorker.onstatechange = () => {
                if (installingWorker.state === "installed") {
                  if (navigator.serviceWorker.controller) {
                    console.log("[PWA] New content is available; please refresh.");
                  }
                }
              };
            }
          };
        })
        .catch((error) => {
          console.error("[PWA] Service Worker registration failed:", error);
        });
    };

    if (document.readyState === "complete") {
      registerSW();
    } else {
      window.addEventListener("load", registerSW);
      return () => window.removeEventListener("load", registerSW);
    }
  }, []);

  return null;
}
