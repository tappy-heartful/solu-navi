"use client";

import React from "react";

type Props = {
  headers: string[];
  emptyMessage?: string;
  hasData: boolean;
  children: React.ReactNode;
};

/**
 * 検索機能を省いた、シンプルなテーブルコンポーネント
 */
export const SimpleTable = ({
  headers,
  emptyMessage = "データがありません",
  hasData,
  children,
}: Props) => {
  if (!hasData) {
    return (
      <div className="table-empty-card">
        <span className="table-empty-text">{emptyMessage}</span>
      </div>
    );
  }

  return (
    <div className="table-wrapper">
      <table className="list-table">
        <thead>
          <tr>
            {headers.map((header, i) => (
              <th key={i}>{header}</th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
};
