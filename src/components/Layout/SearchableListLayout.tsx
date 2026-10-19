"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus, faMagnifyingGlass, faRotateLeft } from "@fortawesome/free-solid-svg-icons";
import { useBreadcrumb } from "@/contexts/BreadcrumbContext";
import { SearchableListReturn } from "@/hooks/useSearchableList";
import { useAuth } from "@/contexts/AuthContext";
import { BaseLayout } from "./BaseLayout";
import { BackNavigation } from "@/components/Common/BackNavigation";
import styles from "./SearchableListLayout.module.css";

type Props<T extends Record<string, any>, F extends Record<string, any>> = {
  title: string;
  icon?: string;
  basePath: string;
  list: SearchableListReturn<T, F>;
  searchFields: React.ReactNode;
  extraHeaderContent?: React.ReactNode;
  extraSearchHeaderContent?: React.ReactNode;
  tableHeaders: (string | { content: React.ReactNode; className?: string })[];
  onSearch?: (filters: F) => void;
  hideAddButton?: boolean;
  topSlot?: React.ReactNode;
  children: React.ReactNode;
};

export const SearchableListLayout = <
  T extends Record<string, any>,
  F extends Record<string, any>
>({
  title,
  icon,
  basePath,
  list,
  searchFields,
  extraHeaderContent,
  extraSearchHeaderContent,
  tableHeaders,
  onSearch,
  hideAddButton,
  topSlot,
  children,
}: Props<T, F>) => {
  const { setBreadcrumbs } = useBreadcrumb();
  const { isAdmin } = useAuth();

  useEffect(() => {
    setBreadcrumbs([
      { label: "ホーム", href: "/" },
      { label: `${title}一覧` },
    ]);
  }, [setBreadcrumbs, title]);

  const count = list.filteredData.length;

  return (
    <BaseLayout>
      <div className={styles.wrapper}>
        {/* 画面ヘッダー */}
        <div className={styles.header}>
          <h1 className={styles.title}>
            {icon && <i className={`${icon} ${styles.headerIcon}`} />}
            <span>{title}一覧</span>
            <span className={styles.headerCount}>({count}件)</span>
          </h1>

          {isAdmin && !hideAddButton && (
            <Link
              href={`${basePath}/edit?mode=new`}
              prefetch={false}
              className={styles.addButton}
            >
              <FontAwesomeIcon icon={faPlus} />
              <span>新規作成</span>
            </Link>
          )}
        </div>

        {/* トップスロット（カスタムバナーやアナウンス等） */}
        {topSlot && <div className={styles.topSlotArea}>{topSlot}</div>}

        {/* 検索カード */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>
              <FontAwesomeIcon icon={faMagnifyingGlass} className={styles.cardTitleIcon} />
              <span>絞り込み検索</span>
            </h2>
            {extraSearchHeaderContent}
          </div>

          {searchFields}

          <div className={styles.filterActions}>
            <button
              type="button"
              className={styles.clearBtn}
              onClick={list.resetFilters}
            >
              <FontAwesomeIcon icon={faRotateLeft} />
              <span>クリア</span>
            </button>
            {onSearch && (
              <button
                type="button"
                className={styles.searchBtn}
                onClick={() => onSearch(list.filters)}
              >
                <FontAwesomeIcon icon={faMagnifyingGlass} />
                <span>検索</span>
              </button>
            )}
          </div>
        </div>

        {/* 一覧カード */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>
              {icon && <i className={`${icon} ${styles.cardTitleIcon}`} />}
              <span>{title}</span>
              <span className={styles.cardCount}>({count}件)</span>
            </h2>
            {extraHeaderContent}
          </div>

          {count > 0 ? (
            <div className="table-wrapper">
              <table className="list-table">
                <thead>
                  <tr>
                    {tableHeaders.map((header, i) => {
                      if (typeof header === "string") {
                        return <th key={i}>{header}</th>;
                      }
                      return (
                        <th key={i} className={header.className}>
                          {header.content}
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>{children}</tbody>
              </table>
            </div>
          ) : (
            <div className="table-empty-card">
              <span className="table-empty-text">該当の{title}はありません🍀</span>
            </div>
          )}

          {isAdmin && !hideAddButton && (
            <div className={styles.bottomAddWrapper}>
              <Link
                href={`${basePath}/edit?mode=new`}
                prefetch={false}
                className={styles.bottomAddBtn}
              >
                <FontAwesomeIcon icon={faPlus} />
                <span>新規作成</span>
              </Link>
            </div>
          )}
        </div>

        <BackNavigation href="/" label="ホーム" />
      </div>
    </BaseLayout>
  );
};

