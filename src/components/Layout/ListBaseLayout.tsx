"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus, faHouse } from "@fortawesome/free-solid-svg-icons";
import { useBreadcrumb } from "@/contexts/BreadcrumbContext";
import { useAuth } from "@/contexts/AuthContext";
import styles from "./ListBaseLayout.module.css";

type Props = {
  title: string;
  icon?: string;
  basePath: string;
  count?: number;
  hideAddButton?: boolean;
  children: React.ReactNode;
};

/**
 * グループ表示・テーブルベースの一覧画面共通レイアウト
 */
export const ListBaseLayout = ({
  title,
  icon,
  basePath,
  count,
  hideAddButton,
  children,
}: Props) => {
  const { setBreadcrumbs } = useBreadcrumb();
  const { isAdmin } = useAuth();

  useEffect(() => {
    setBreadcrumbs([
      { label: "ホーム", href: "/" },
      { label: `${title}一覧` },
    ]);
  }, [setBreadcrumbs, title]);

  return (
    <div className={styles.wrapper}>
      <div className={styles.header}>
        <h1 className={styles.title}>
          {icon && <i className={`${icon} ${styles.icon}`} />}
          <span>{title}一覧</span>
          {count !== undefined && <span className={styles.count}>({count}件)</span>}
        </h1>

        {isAdmin && !hideAddButton && (
          <Link href={`${basePath}/edit?mode=new`} prefetch={false} className={styles.addButton}>
            <FontAwesomeIcon icon={faPlus} />
            <span>新規作成</span>
          </Link>
        )}
      </div>

      <div className={styles.content}>
        {children}
      </div>

      <div className={styles.footer}>
        <Link href="/" prefetch={false} className={styles.backLink}>
          <FontAwesomeIcon icon={faHouse} />
          <span>ホームに戻る</span>
        </Link>
      </div>
    </div>
  );
};
