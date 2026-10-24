"use client";

import React, { ReactNode, useEffect } from "react";
import { config } from "@fortawesome/fontawesome-svg-core";
import { AuthProvider } from "../contexts/AuthContext";
import { BreadcrumbProvider } from "../contexts/BreadcrumbContext";
import { AuthGuard } from "../components/AuthGuard";
import { CommonDialog } from "../components/Common/CommonDialog";
import CommonModal from "../components/CommonModal";
import { Spinner, showSpinner } from "../components/Common/Spinner";
import { ServiceWorkerRegister } from "../components/PWA/ServiceWorkerRegister";

// Font Awesome の autoAddCss を無効化
config.autoAddCss = false;

export function ClientLayout({ children }: { children: ReactNode }) {
  useEffect(() => {
    // 内部リンク（<a>タグ）クリック時に音楽的ローディングスピナーを表示する (streak-navi準拠)
    const handleAnchorClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest("a");
      if (!target) return;

      const href = target.getAttribute("href");
      const targetAttr = target.getAttribute("target");

      // hrefがURLスキーム（例えばhttp://やmailto:）を持たず、別タブでないなら 内部リンクとみなす
      if (href && href.startsWith("/") && targetAttr !== "_blank" && !e.ctrlKey && !e.metaKey) {
        // 現在のURL（パス + クエリ）と同じならスピナーを出さない
        const currentPath = window.location.pathname + window.location.search;
        if (href === currentPath || href === window.location.pathname) {
          return;
        }
        showSpinner();
      }
    };

    document.addEventListener("click", handleAnchorClick);
    return () => document.removeEventListener("click", handleAnchorClick);
  }, []);

  return (
    <AuthProvider>
      <BreadcrumbProvider>
        <AuthGuard>{children}</AuthGuard>
        <CommonDialog />
        <CommonModal />
        <Spinner />
        <ServiceWorkerRegister />
      </BreadcrumbProvider>
    </AuthProvider>
  );
}
