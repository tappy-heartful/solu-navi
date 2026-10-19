"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { useBreadcrumb } from "@/contexts/BreadcrumbContext";
import { SearchableListReturn } from "@/hooks/useSearchableList";
import { useAuth } from "@/contexts/AuthContext";
import { BaseLayout } from "./BaseLayout";

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
    setBreadcrumbs([{ label: `${title}一覧` }]);
  }, [setBreadcrumbs, title]);

  return (
    <BaseLayout>
      <div className="page-header">
        <h1>
          {icon && <i className={icon} style={{ marginRight: "0.5rem" }}></i>}
          {title}一覧
        </h1>
      </div>

      {topSlot}

      <div className="container">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "1rem",
          }}
        >
          <h3 style={{ margin: 0 }}>
            {icon && <i className={icon} style={{ marginRight: "0.5rem" }} />}
            検索
          </h3>
          {extraSearchHeaderContent}
        </div>
        {searchFields}
        <div className="confirm-buttons" style={{ display: "flex", gap: "0.5rem", marginTop: "1rem" }}>
          <button
            type="button"
            className="clear-button"
            onClick={list.resetFilters}
            style={{
              padding: "0.5rem 1rem",
              borderRadius: "6px",
              border: "1px solid #ccc",
              background: "#fff",
              cursor: "pointer",
            }}
          >
            クリア
          </button>
          {onSearch && (
            <button
              type="button"
              className="save-button"
              onClick={() => onSearch(list.filters)}
              style={{
                padding: "0.5rem 1.25rem",
                borderRadius: "6px",
                border: "none",
                background: "var(--primary-color, #146081)",
                color: "#fff",
                cursor: "pointer",
              }}
            >
              検索
            </button>
          )}
        </div>
      </div>

      <div className="container">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "1rem",
            flexWrap: "wrap",
            gap: "0.5rem",
          }}
        >
          <h3 style={{ margin: 0 }}>
            {icon && <i className={icon} style={{ marginRight: "0.5rem" }} />}
            {title} ({list.filteredData.length}件)
          </h3>
          {extraHeaderContent}
        </div>

        <div className="table-wrapper" style={{ overflowX: "auto" }}>
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
            <tbody>
              {list.filteredData.length > 0 ? (
                children
              ) : (
                <tr>
                  <td colSpan={tableHeaders.length} className="text-center" style={{ textAlign: "center", padding: "2rem" }}>
                    該当の{title}はありません🍀
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {isAdmin && !hideAddButton && (
          <div style={{ display: "flex", justifyContent: "center", marginTop: "1.5rem" }}>
            <Link
              href={`${basePath}/edit?mode=new`}
              prefetch={false}
              className="list-add-button"
              style={{
                textDecoration: "none",
                display: "inline-flex",
                justifyContent: "center",
                alignItems: "center",
                width: "fit-content",
                padding: "12px 24px",
                background: "var(--primary-color, #146081)",
                color: "#fff",
                borderRadius: "8px",
                fontWeight: 600,
              }}
            >
              ＋ 新規作成
            </Link>
          </div>
        )}
      </div>

      <div className="page-footer" style={{ textAlign: "center", margin: "2rem 0" }}>
        <Link href="/" prefetch={false} className="back-link">
          ← ホームに戻る
        </Link>
      </div>
    </BaseLayout>
  );
};
