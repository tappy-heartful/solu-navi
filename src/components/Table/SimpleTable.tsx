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
        <tbody>
          {hasData ? (
            children
          ) : (
            <tr>
              <td colSpan={headers.length} style={{ textAlign: "center", padding: "2rem", color: "#64748b" }}>
                {emptyMessage}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};
