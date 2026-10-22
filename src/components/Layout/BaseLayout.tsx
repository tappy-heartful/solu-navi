"use client";

import React, { ReactNode } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faRotateRight, faShareNodes } from "@fortawesome/free-solid-svg-icons";
import { Header } from "./Header";
import { useBreadcrumb } from "../../contexts/BreadcrumbContext";
import { showSpinner, hideSpinner } from "../Common/Spinner";
import { showDialog } from "../Common/CommonDialog";
import styles from "./BaseLayout.module.css";

interface BaseLayoutProps {
  children: ReactNode;
  title?: string;
  showBreadcrumbs?: boolean;
  showActions?: boolean;
  stickyHeader?: boolean;
}

export function BaseLayout({
  children,
  title,
  showBreadcrumbs = true,
  showActions = true,
  stickyHeader = true,
}: BaseLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { breadcrumbs } = useBreadcrumb();

  const isSticky = stickyHeader;

  const handleRefresh = () => {
    showSpinner();
    router.refresh();
    setTimeout(() => {
      hideSpinner();
    }, 800);
  };

  const handleShare = () => {
    const url = typeof window !== "undefined" ? window.location.href : "";
    if (navigator.share) {
      navigator.share({ title: document.title, url }).catch((error) => {
        console.error("Share error:", error);
      });
    } else if (navigator.clipboard) {
      navigator.clipboard
        .writeText(url)
        .then(() => showDialog({ title: "共有", message: "URLをクリップボードにコピーしました！", type: "success" }))
        .catch((error) => console.error("Clipboard error:", error));
    }
  };

  const hasBreadcrumbs = showBreadcrumbs && breadcrumbs.length > 0;
  const shouldRenderBar = hasBreadcrumbs || showActions;

  return (
    <div className={styles.wrapper}>
      <div className={`${styles.headerGroup} ${isSticky ? styles.sticky : ""}`}>
        <Header />

        {/* パンくずリスト & アクション (ヘッダー同様に固定) */}
        {shouldRenderBar && (
          <div className={styles.breadcrumbBar}>
            <div className={styles.breadcrumbContainer}>
              {hasBreadcrumbs && (
                <nav className={styles.breadcrumbNav}>
                  {breadcrumbs.map((item, index) => {
                    const isLast = index === breadcrumbs.length - 1;
                    return (
                      <span key={index} className={styles.breadcrumbItem}>
                        {index > 0 && <span className={styles.separator}>›</span>}
                        {item.href && !isLast ? (
                          <Link
                            href={item.href}
                            prefetch={false}
                            className={styles.breadcrumbLink}
                            onClick={() => showSpinner()}
                          >
                            {item.label}
                          </Link>
                        ) : (
                          <span className={isLast ? styles.breadcrumbCurrent : ""}>{item.label}</span>
                        )}
                      </span>
                    );
                  })}
                </nav>
              )}

              {showActions && (
                <div className={styles.breadcrumbActions}>
                  <button
                    type="button"
                    className={styles.refreshButton}
                    onClick={handleRefresh}
                    title="画面を更新"
                    aria-label="画面を更新"
                  >
                    <FontAwesomeIcon icon={faRotateRight} />
                  </button>
                  <button
                    type="button"
                    className={styles.shareButton}
                    onClick={handleShare}
                    title="共有"
                    aria-label="共有"
                  >
                    <FontAwesomeIcon icon={faShareNodes} />
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <main className={styles.main}>
        {title && <h1 className={styles.pageTitle}>{title}</h1>}
        <div className={styles.content}>{children}</div>
      </main>
    </div>
  );
}
