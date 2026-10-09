"use client";

import React from "react";

type Props = {
  label: string;
  children: React.ReactNode;
  preWrap?: boolean;
};

export const DisplayField = ({ label, children, preWrap = false }: Props) => {
  return (
    <div className="form-group" style={{ marginBottom: "1.25rem" }}>
      <label
        className="label-title"
        style={{
          display: "block",
          fontSize: "0.85rem",
          fontWeight: 600,
          color: "#475569",
          marginBottom: "0.35rem",
        }}
      >
        {label}
      </label>
      <div
        className="label-value"
        style={{
          fontSize: "1rem",
          color: "#0f172a",
          padding: "0.5rem 0.75rem",
          backgroundColor: "#f8fafc",
          border: "1px solid #e2e8f0",
          borderRadius: "6px",
          minHeight: "42px",
          display: "flex",
          alignItems: "center",
          whiteSpace: preWrap ? "pre-wrap" : "normal",
        }}
      >
        {children || <span style={{ color: "#94a3b8" }}>未設定</span>}
      </div>
    </div>
  );
};
