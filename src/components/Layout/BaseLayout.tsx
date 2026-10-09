"use client";

import React, { ReactNode } from "react";
import Link from "next/link";
import { Header } from "./Header";
import { Footer } from "./Footer";
import { CommonDialog } from "../Common/CommonDialog";
import { Spinner } from "../Common/Spinner";
import { useBreadcrumb } from "../../contexts/BreadcrumbContext";
import styles from "./BaseLayout.module.css";

interface BaseLayoutProps {
  children: ReactNode;
  title?: string;
  showBreadcrumbs?: boolean;
}

export function BaseLayout({ children, title, showBreadcrumbs = true }: BaseLayoutProps) {
  const { breadcrumbs } = useBreadcrumb();

  return (
    <div className={styles.wrapper}>
      <Header />

      {/* パンくずリスト */}
      {showBreadcrumbs && breadcrumbs.length > 0 && (
        <div className={styles.breadcrumbBar}>
          <div className={styles.breadcrumbContainer}>
            {breadcrumbs.map((item, index) => {
              const isLast = index === breadcrumbs.length - 1;
              return (
                <span key={index} className={styles.breadcrumbItem}>
                  {index > 0 && <span className={styles.separator}>/</span>}
                  {item.href && !isLast ? (
                    <Link href={item.href} prefetch={false} className={styles.breadcrumbLink}>
                      {item.label}
                    </Link>
                  ) : (
                    <span className={isLast ? styles.breadcrumbCurrent : ""}>{item.label}</span>
                  )}
                </span>
              );
            })}
          </div>
        </div>
      )}

      <main className={styles.main}>
        {title && <h1 className={styles.pageTitle}>{title}</h1>}
        <div className={styles.content}>{children}</div>
      </main>

      <Footer />
      <CommonDialog />
      <Spinner />
    </div>
  );
}
