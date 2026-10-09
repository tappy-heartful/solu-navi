import React from "react";
import Link from "next/link";
import styles from "./FormFooter.module.css";

export interface FormFooterProps {
  backHref?: string;
  backText?: string;
  submitText?: string;
  cancelText?: string;
  onCancel?: () => void;
  submitting?: boolean;
  disabled?: boolean;
}

export function FormFooter({
  backHref,
  backText = "戻る",
  submitText,
  cancelText = "キャンセル",
  onCancel,
  submitting = false,
  disabled = false,
}: FormFooterProps) {
  return (
    <div className={styles.footer} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      {(submitText || onCancel) && (
        <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
          {onCancel && (
            <button
              type="button"
              className={styles.cancelBtn}
              onClick={onCancel}
              disabled={submitting}
            >
              {cancelText}
            </button>
          )}
          {submitText && (
            <button
              type="submit"
              className={styles.submitBtn}
              disabled={disabled || submitting}
            >
              {submitting ? "処理中..." : submitText}
            </button>
          )}
        </div>
      )}

      {backHref && (
        <div style={{ marginTop: "8px" }}>
          <Link
            href={backHref}
            style={{
              color: "var(--primary, #146081)",
              textDecoration: "none",
              fontSize: "14px",
              fontWeight: 500,
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
            }}
          >
            ← {backText}に戻る
          </Link>
        </div>
      )}
    </div>
  );
}
